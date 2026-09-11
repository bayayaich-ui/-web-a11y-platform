import { Channel } from 'amqplib';
import { connectQueue } from './rabbitmq-connection';
import { DiagnosticService } from '../diagnostic/diagnostic-service';
import { FixGenerator } from '../fix-generator/fix-generator';

const ANALYZE_QUEUE = 'violation.analyze';
const ANALYSIS_COMPLETED_QUEUE = 'violation.analysis.completed';

export async function startAnalyzeConsumer(channel: Channel) {
  // ensure queues exist
  await channel.assertQueue(ANALYZE_QUEUE, { durable: true });
  await channel.assertQueue(ANALYSIS_COMPLETED_QUEUE, { durable: true });

  console.log('Analyse consumer prêt sur la file', ANALYZE_QUEUE);

  await channel.consume(ANALYZE_QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const violation = payload.violation;
      const violationId = payload.violation_id;

      const diagnosticService = new DiagnosticService(process.env.GEMINI_API_KEY!);
      const fixGen = new FixGenerator(process.env.GEMINI_API_KEY!);

      let diagnostic = null;
      try {
        diagnostic = await diagnosticService.genererDiagnostic(violation);
      } catch (e) {
        console.warn('Diagnostic IA échoué pour violation', violationId, e);
      }

      let correctif = null;
      try {
        correctif = await fixGen.genererCorrectif(violation);
      } catch (e) {
        console.warn('Génération de correctif échouée pour violation', violationId, e);
      }

      const result = {
        violation_id: violationId,
        diagnostic: diagnostic && 'diagnostic' in diagnostic ? diagnostic.diagnostic : diagnostic,
        correctif,
      };

      // publish result
      await channel.assertQueue(ANALYSIS_COMPLETED_QUEUE, { durable: true });
      console.log('Publishing analysis.completed result for', violationId, JSON.stringify(result).slice(0, 2000));
      channel.sendToQueue(ANALYSIS_COMPLETED_QUEUE, Buffer.from(JSON.stringify(result)), { persistent: true });
      channel.ack(msg);
    } catch (err) {
      console.error('Erreur lors du traitement d\'un message analyze:', err);
      try { channel.nack(msg, false, false); } catch(e){ /* ignore */ }
    }
  });
}
