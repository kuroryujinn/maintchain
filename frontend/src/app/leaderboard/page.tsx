import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, RankList } from '@/components/maintchain/ui';
import { leaderboardGroups } from '@/data/maintchain';

export default function LeaderboardPage() {
  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="04"
        title="Professional rankings grounded in verified work"
        caption="Leaderboard · These seeded leaderboards show how MaintChain can compare trust, evidence quality, growth, and consistency without feeling game-like."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {leaderboardGroups.map((group, idx) => (
          <FadeInView key={group.id} direction="up" distance="sm" duration={400} delay={idx * 80}>
            <RankList group={group} glass />
          </FadeInView>
        ))}
      </div>
    </div>
  );
}
