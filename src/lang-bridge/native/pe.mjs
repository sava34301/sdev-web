// =========================================================================
// SDEV Native Windows PE/COFF (.exe) Generator
//
// Generates standalone 64-bit Windows console executables (PE32+) directly
// from machine code and data without requiring GCC, Clang, MSVC, or external
// linkers.
// =========================================================================

import { writeFileSync, chmodSync } from 'node:fs';

/**
 * Builds a valid PE32+ (AMD64) Windows Console Executable Buffer.
 *
 * @param {object} opts
 * @param {Uint8Array} opts.textBytes - x86-64 machine code for .text section
 * @param {string[]} opts.messages - string messages to print
 * @param {number} [opts.exitCode=0] - exit code
 * @returns {Buffer} PE executable file buffer
 */
export function buildPeExecutable(opts = {}) {
  const exitCode = opts.exitCode ?? 0;
  const messages = opts.messages ?? ['Hello from SDEV native Windows!\n'];

  // 1. Prepare read-only data (.rdata):
  // We need to import from KERNEL32.dll:
  // - GetStdHandle (hint 0)
  // - WriteFile (hint 0)
  // - ExitProcess (hint 0)

  const align = (n, to) => Math.ceil(n / to) * to;

  // Build the message data
  const msgBuffers = messages.map((m) => Buffer.from(m, 'utf8'));

  // RVA base of sections:
  // Headers: 0x0000..0x0200 (file size 0x200, virt size 0x1000)
  // .text:   0x1000..0x2000 (file size 0x200, virt size 0x1000)
  // .rdata:  0x2000..0x3000 (file size 0x400, virt size 0x1000)
  const RVA_TEXT = 0x1000;
  const RVA_RDATA = 0x2000;

  // Layout inside .rdata:
  // offset 0x00: Import Directory (2 entries * 20 bytes = 40 bytes)
  // offset 0x28: ILT (Import Lookup Table: 4 qwords = 32 bytes)
  // offset 0x48: IAT (Import Address Table: 4 qwords = 32 bytes)
  // offset 0x68: Hint/Name entries:
  //   - GetStdHandle: 2 bytes hint + "GetStdHandle\0" (15 bytes) -> 16 bytes
  //   - WriteFile:    2 bytes hint + "WriteFile\0" (12 bytes) -> 12 bytes
  //   - ExitProcess:  2 bytes hint + "ExitProcess\0" (14 bytes) -> 14 bytes
  // offset 0xA0: "KERNEL32.dll\0" (13 bytes)
  // offset 0xB0: Messages data + lengths

  const rdata = Buffer.alloc(0x400);

  const offImportDir = 0x00;
  const offILT = 0x28;
  const offIAT = 0x50;
  const offHintGetStdHandle = 0x78;
  const offHintWriteFile = 0x90;
  const offHintExitProcess = 0xA0;
  const offDllName = 0xB0;
  const offMessages = 0xC0;

  // Fill Hint/Name entries:
  rdata.writeUInt16LE(0, offHintGetStdHandle);
  rdata.write('GetStdHandle\0', offHintGetStdHandle + 2, 'ascii');

  rdata.writeUInt16LE(0, offHintWriteFile);
  rdata.write('WriteFile\0', offHintWriteFile + 2, 'ascii');

  rdata.writeUInt16LE(0, offHintExitProcess);
  rdata.write('ExitProcess\0', offHintExitProcess + 2, 'ascii');

  // Fill DLL name
  rdata.write('KERNEL32.dll\0', offDllName, 'ascii');

  // Fill ILT and IAT entries (RVAs to Hint/Name):
  const rvaGetStdHandle = RVA_RDATA + offHintGetStdHandle;
  const rvaWriteFile = RVA_RDATA + offHintWriteFile;
  const rvaExitProcess = RVA_RDATA + offHintExitProcess;

  rdata.writeBigUInt64LE(BigInt(rvaGetStdHandle), offILT);
  rdata.writeBigUInt64LE(BigInt(rvaWriteFile), offILT + 8);
  rdata.writeBigUInt64LE(BigInt(rvaExitProcess), offILT + 16);
  rdata.writeBigUInt64LE(0n, offILT + 24);

  rdata.writeBigUInt64LE(BigInt(rvaGetStdHandle), offIAT);
  rdata.writeBigUInt64LE(BigInt(rvaWriteFile), offIAT + 8);
  rdata.writeBigUInt64LE(BigInt(rvaExitProcess), offIAT + 16);
  rdata.writeBigUInt64LE(0n, offIAT + 24);

  // Fill Import Directory Entry 0 (KERNEL32):
  rdata.writeUInt32LE(RVA_RDATA + offILT, offImportDir + 0);  // OriginalFirstThunk (ILT)
  rdata.writeUInt32LE(0, offImportDir + 4);                  // TimeDateStamp
  rdata.writeUInt32LE(0, offImportDir + 8);                  // ForwarderChain
  rdata.writeUInt32LE(RVA_RDATA + offDllName, offImportDir + 12); // Name
  rdata.writeUInt32LE(RVA_RDATA + offIAT, offImportDir + 16); // FirstThunk (IAT)
  // Entry 1 is all zeroes (terminator)

  // Copy messages to .rdata
  let currMsgOff = offMessages;
  const msgDescriptors = [];
  for (const mBuf of msgBuffers) {
    mBuf.copy(rdata, currMsgOff);
    msgDescriptors.push({ rva: RVA_RDATA + currMsgOff, len: mBuf.length });
    currMsgOff += align(mBuf.length, 8);
  }

  // 2. Build .text section (Machine Code):
  // Entry point calling Windows x64 API:
  // Calling Convention:
  // - RCX, RDX, R8, R9 for first 4 arguments
  // - 32 bytes shadow space on stack
  // - 16-byte stack alignment before CALL
  //
  // Steps:
  // sub rsp, 40               ; 48 83 EC 28 (allocate shadow space + alignment)
  // mov ecx, -11              ; B9 F5 FF FF FF (STD_OUTPUT_HANDLE = -11)
  // call [IAT_GetStdHandle]   ; FF 15 <rel32>
  // mov rbx, rax              ; 48 89 C3 (save handle in non-volatile RBX)
  //
  // For each message:
  // mov rcx, rbx              ; 48 89 D9 (hConsoleOutput)
  // lea rdx, [RIP + msg_rel]  ; 48 8D 15 <rel32>
  // mov r8d, msg_len          ; 41 B8 <len32>
  // lea r9, [rsp + 32]        ; 4C 8D 4C 24 20 (lpNumberOfBytesWritten)
  // mov qword [rsp + 32], 0   ; 48 C7 44 24 20 00 00 00 00
  // call [IAT_WriteFile]      ; FF 15 <rel32>
  //
  // Exit:
  // mov ecx, exitCode         ; B9 <exitCode>
  // call [IAT_ExitProcess]    ; FF 15 <rel32>
  // add rsp, 40               ; 48 83 C4 28
  // ret                       ; C3

  const text = Buffer.alloc(0x200);
  let rip = 0;

  const emit = (...bytes) => {
    for (const b of bytes) text[rip++] = b;
  };
  const emit32 = (val) => {
    text.writeInt32LE(val, rip);
    rip += 4;
  };

  // sub rsp, 56 (0x38)
  emit(0x48, 0x83, 0xEC, 0x38);

  // mov ecx, -11 (STD_OUTPUT_HANDLE = 0xFFFFFFF5)
  emit(0xB9, 0xF5, 0xFF, 0xFF, 0xFF);

  // call [IAT_GetStdHandle]
  const iatGetStdHandleRva = RVA_RDATA + offIAT + 0;
  emit(0xFF, 0x15);
  emit32(iatGetStdHandleRva - (RVA_TEXT + rip + 4));

  // mov rbx, rax (save handle)
  emit(0x48, 0x89, 0xC3);

  const iatWriteFileRva = RVA_RDATA + offIAT + 8;
  for (const desc of msgDescriptors) {
    // mov rcx, rbx
    emit(0x48, 0x89, 0xD9);

    // lea rdx, [desc.rva] -> 48 8D 15 <rel32>
    emit(0x48, 0x8D, 0x15);
    emit32(desc.rva - (RVA_TEXT + rip + 4));

    // mov r8d, desc.len -> 41 B8 <len32>
    emit(0x41, 0xB8);
    emit32(desc.len);

    // lea r9, [rsp + 40] -> 4C 8D 4C 24 28 (lpNumberOfBytesWritten)
    emit(0x4C, 0x8D, 0x4C, 0x24, 0x28);

    // mov qword [rsp + 32], 0 -> 48 C7 44 24 20 00 00 00 00 (5th param: lpOverlapped = NULL)
    emit(0x48, 0xC7, 0x44, 0x24, 0x20, 0x00, 0x00, 0x00, 0x00);

    // call [IAT_WriteFile]
    emit(0xFF, 0x15);
    emit32(iatWriteFileRva - (RVA_TEXT + rip + 4));
  }

  // mov ecx, exitCode -> B9 <code32>
  const iatExitProcessRva = RVA_RDATA + offIAT + 16;
  emit(0xB9);
  emit32(exitCode);

  // call [IAT_ExitProcess]
  emit(0xFF, 0x15);
  emit32(iatExitProcessRva - (RVA_TEXT + rip + 4));

  // 3. Assemble PE Headers:
  const headers = Buffer.alloc(0x200);

  // DOS Header:
  headers.write('MZ', 0, 'ascii'); // e_magic
  headers.writeUInt32LE(0x80, 0x3C); // e_lfanew (pointer to PE header)

  // DOS Stub:
  const stub = 'This program cannot be run in DOS mode.\r\r\n$';
  headers.write(stub, 0x40, 'ascii');

  // PE Signature:
  headers.write('PE\0\0', 0x80, 'ascii');

  // COFF Header (20 bytes at 0x84):
  headers.writeUInt16LE(0x8664, 0x84); // Machine = AMD64
  headers.writeUInt16LE(2, 0x86);      // NumberOfSections = 2 (.text, .rdata)
  headers.writeUInt32LE(0, 0x88);      // TimeDateStamp
  headers.writeUInt32LE(0, 0x8C);      // PointerToSymbolTable
  headers.writeUInt32LE(0, 0x90);      // NumberOfSymbols
  headers.writeUInt16LE(240, 0x94);    // SizeOfOptionalHeader = 240
  headers.writeUInt16LE(0x0022, 0x96); // Characteristics = EXECUTABLE | LARGE_ADDRESS_AWARE

  // Optional Header (PE32+ 240 bytes at 0x98):
  headers.writeUInt16LE(0x020B, 0x98); // Magic = PE32+
  headers.writeUInt8(14, 0x9A);        // MajorLinkerVersion
  headers.writeUInt8(0, 0x9B);         // MinorLinkerVersion
  headers.writeUInt32LE(0x1000, 0x9C); // SizeOfCode
  headers.writeUInt32LE(0x1000, 0xA0); // SizeOfInitializedData
  headers.writeUInt32LE(0, 0xA4);      // SizeOfUninitializedData
  headers.writeUInt32LE(RVA_TEXT, 0xA8); // AddressOfEntryPoint
  headers.writeUInt32LE(RVA_TEXT, 0xAC); // BaseOfCode
  headers.writeBigUInt64LE(0x140000000n, 0xB0); // ImageBase
  headers.writeUInt32LE(0x1000, 0xB8); // SectionAlignment = 4096
  headers.writeUInt32LE(0x200, 0xBC);  // FileAlignment = 512
  headers.writeUInt16LE(6, 0xC0);      // MajorOSVersion
  headers.writeUInt16LE(0, 0xC2);      // MinorOSVersion
  headers.writeUInt16LE(6, 0xC8);      // MajorSubsystemVersion
  headers.writeUInt16LE(0, 0xCA);      // MinorSubsystemVersion
  headers.writeUInt32LE(0x3000, 0xD0); // SizeOfImage
  headers.writeUInt32LE(0x200, 0xD4);  // SizeOfHeaders
  headers.writeUInt16LE(3, 0xDC);      // Subsystem = IMAGE_SUBSYSTEM_WINDOWS_CUI (Console)
  headers.writeUInt16LE(0x8160, 0xDE); // DllCharacteristics
  headers.writeBigUInt64LE(0x100000n, 0xE0); // SizeOfStackReserve
  headers.writeBigUInt64LE(0x1000n, 0xE8);   // SizeOfStackCommit
  headers.writeBigUInt64LE(0x100000n, 0xF0); // SizeOfHeapReserve
  headers.writeBigUInt64LE(0x1000n, 0xF8);   // SizeOfHeapCommit
  headers.writeUInt32LE(0, 0x100);           // LoaderFlags
  headers.writeUInt32LE(16, 0x104);          // NumberOfRvaAndSizes

  // Data Directory [1] = Import Table (offset 0x110):
  headers.writeUInt32LE(RVA_RDATA + offImportDir, 0x110); // RVA
  headers.writeUInt32LE(40, 0x114);                       // Size

  // Data Directory [12] = IAT (offset 0x168):
  headers.writeUInt32LE(RVA_RDATA + offIAT, 0x168);       // RVA
  headers.writeUInt32LE(32, 0x16C);                       // Size

  // Section Headers (at 0x188):
  // Section 1: .text (40 bytes at 0x188)
  headers.write('.text\0\0\0', 0x188, 'ascii');
  headers.writeUInt32LE(0x1000, 0x188 + 8);  // VirtualSize
  headers.writeUInt32LE(RVA_TEXT, 0x188 + 12); // VirtualAddress
  headers.writeUInt32LE(0x200, 0x188 + 16);  // SizeOfRawData
  headers.writeUInt32LE(0x200, 0x188 + 20);  // PointerToRawData
  headers.writeUInt32LE(0x60000020, 0x188 + 36); // Characteristics = Code | Exec | Read

  // Section 2: .rdata (40 bytes at 0x1B0)
  headers.write('.rdata\0\0', 0x1B0, 'ascii');
  headers.writeUInt32LE(0x1000, 0x1B0 + 8);   // VirtualSize
  headers.writeUInt32LE(RVA_RDATA, 0x1B0 + 12); // VirtualAddress
  headers.writeUInt32LE(0x400, 0x1B0 + 16);   // SizeOfRawData
  headers.writeUInt32LE(0x400, 0x1B0 + 20);   // PointerToRawData
  headers.writeUInt32LE(0xC0000040, 0x1B0 + 36); // Characteristics = InitData | Read | Write

  // Combine headers (0x200) + .text (0x200) + .rdata (0x400) = 0x800 bytes
  return Buffer.concat([headers, text, rdata]);
}

/**
 * Links a native Windows .exe file directly to outPath.
 *
 * @param {string[]} messages - messages to output
 * @param {string} outPath - target .exe path
 * @param {number} [exitCode=0]
 */
export function linkPe(messages, outPath, exitCode = 0) {
  const buf = buildPeExecutable({ messages, exitCode });
  writeFileSync(outPath, buf);
  try { chmodSync(outPath, 0o755); } catch { /* windows chmod is no-op */ }
  return outPath;
}
