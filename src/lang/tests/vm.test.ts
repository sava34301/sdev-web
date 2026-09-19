// @ts-nocheck
import { expect, test } from "bun:test";
import { VM } from '../vm';
import { ReturnException, SdevError } from '../errors';
import { FunctionDef, OpCode } from '../bytecode';
import { Environment } from '../environment';

test("VM exception propagates out of callFunction", () => {
  const vm = new VM(() => {});

  const def: FunctionDef = {
    name: "test_throw",
    params: [],
    code: [
      { op: 9999 as OpCode, line: 1 } // Invalid opcode will throw SdevError
    ]
  };

  const env = new Environment();

  expect(() => {
    (vm as any).callFunction(def, [], env, 1);
  }).toThrow(SdevError);

  // Verify state is restored properly when an error happens
  expect((vm as any).stack.length).toBe(0);
  expect((vm as any).frames.length).toBe(0);
});

test("VM ReturnException is caught in callFunction", () => {
  const vm = new VM(() => {});

  const env = new Environment();
  const def: FunctionDef = { name: "test", params: [], code: [] };

  // Push some state to verify restoration
  (vm as any).stack.push("saved_stack_value");
  const oldFrame = { def, ip: 0, env };
  (vm as any).frames.push(oldFrame);

  // Override executeLoop to throw a ReturnException
  const originalExecuteLoop = (vm as any).executeLoop;
  let executed = false;
  (vm as any).executeLoop = () => {
    executed = true;
    throw new ReturnException("return_value");
  };

  const result = (vm as any).callFunction(def, [], env, 1);

  expect(executed).toBe(true);
  expect(result).toBe("return_value");

  // Stack and frames should be restored
  expect((vm as any).stack.length).toBe(1);
  expect((vm as any).stack[0]).toBe("saved_stack_value");
  expect((vm as any).frames.length).toBe(1);
  expect((vm as any).frames[0]).toBe(oldFrame);
});
