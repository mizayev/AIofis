/**
 * AI OFFICE — demo run with a FAKE AI (no API keys, no Instagram).
 * Run with:  npm run demo
 */
import { createFakeLlm, createFakeMetrics, SAMPLE_BRIEF } from './dev/fixtures';
import { createOffice } from './office';
import { publish } from './publishing/publisher';

async function main(): Promise<void> {
  const office = createOffice({ llm: createFakeLlm(), metrics: createFakeMetrics() });

  console.log('1) CEO yangi brief yaratdi:', SAMPLE_BRIEF.title);
  const task = office.inbox.createBrief(SAMPLE_BRIEF);

  console.log('2) Agentlar ishlamoqda...');
  const report = await office.orchestrator.runUntilIdle();
  console.log(`   Raundlar: ${report.rounds}, bajarilgan ishlar: ${report.processed}, xatolar: ${report.errors.length}`);

  const current = office.inbox.getTask(task.id);
  console.log('3) Vazifa yoʻli:');
  for (const h of current?.history ?? []) {
    if (h.action !== 'wrote') console.log(`   ${h.actor.padEnd(22)} ${h.from ?? ''} -> ${h.to ?? ''}`);
  }

  const awaiting = office.inbox.listAwaiting();
  console.log(`4) Sizning tasdiqlash qutingizda: ${awaiting.length} ta paket`);
  for (const t of awaiting) {
    console.log('   Caption:\n' + (t.package.instagram?.caption ?? '').replace(/^/gm, '     '));
  }

  if (awaiting[0]) {
    const approved = office.inbox.approve(awaiting[0].id, 'Demo tasdiq');
    console.log('5) CEO tasdiqladi. Holat:', approved.status);
    try {
      await publish(approved);
    } catch (error) {
      console.log('6) ✅ Nashr bloklandi (kutilganidek):', error instanceof Error ? error.message : String(error));
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
