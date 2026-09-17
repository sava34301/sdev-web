const MOCK_DELAY_MS = 20;

const mockSupabase = {
  from: (table) => ({
    update: () => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => {
              await new Promise(r => setTimeout(r, MOCK_DELAY_MS));
              return { data: { id: 'mock-id' }, error: null };
            }
          })
        })
      })
    }),
    insert: (data) => {
      const isArray = Array.isArray(data);
      return {
        select: () => ({
          single: async () => {
            await new Promise(r => setTimeout(r, MOCK_DELAY_MS));
            return { data: { id: 'mock-id' }, error: null };
          },
          then: async (cb) => {
            await new Promise(r => setTimeout(r, MOCK_DELAY_MS));
            if (isArray) {
              return cb({ data: data.map((_, i) => ({ id: `mock-id-${i}` })), error: null });
            }
            return cb({ data: { id: 'mock-id' }, error: null });
          }
        })
      };
    },
    upsert: (data) => {
      return {
        select: () => ({
          then: async (cb) => {
            await new Promise(r => setTimeout(r, MOCK_DELAY_MS));
            return cb({ data: data.map((_, i) => ({ id: `mock-id-${i}` })), error: null });
          }
        })
      };
    }
  })
};

async function runNPlusOne(files) {
  const start = Date.now();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.cloudId) {
      await mockSupabase.from('code_files').update({}).eq('id', file.cloudId).eq('user_id', 'mock').select('id').maybeSingle();
    } else {
      await mockSupabase.from('code_files').insert({}).select('id').single();
    }
  }
  return Date.now() - start;
}

async function runBulkUpsert(files) {
  const start = Date.now();
  const newFiles = files.filter(f => !f.cloudId);
  const existingFiles = files.filter(f => f.cloudId);

  // Note: in actual implementation, supabase upsert handles both insert and update
  await mockSupabase.from('code_files').upsert(files).select().then(() => {});

  return Date.now() - start;
}

async function main() {
  console.log('--- Benchmarking Sync ---');
  const files = Array.from({ length: 50 }, (_, i) => ({
    id: `local-${i}`,
    cloudId: i % 2 === 0 ? `cloud-${i}` : null,
  }));

  const nPlusOneTime = await runNPlusOne(files);
  console.log(`N+1 query time for ${files.length} files: ${nPlusOneTime}ms`);

  const bulkUpsertTime = await runBulkUpsert(files);
  console.log(`Bulk upsert time for ${files.length} files: ${bulkUpsertTime}ms`);

  console.log(`Improvement: ${(nPlusOneTime / bulkUpsertTime).toFixed(2)}x faster`);
}

main().catch(console.error);
