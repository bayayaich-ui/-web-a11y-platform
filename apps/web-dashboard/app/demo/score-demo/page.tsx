import React from 'react';
import ScoreCard from '../../../components/ScoreCard';

const demoScan = {
  id: 'demo-scan',
  status: 'completed',
  score_global: 72,
};

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl mb-6">ScoreCard demo</h1>
      <div className="max-w-md">
        <ScoreCard scan={demoScan as any} />
      </div>
    </main>
  );
}
