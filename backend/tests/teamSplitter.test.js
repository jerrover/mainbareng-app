const { splitTeams } = require('../src/services/teamSplitter');

describe('Balanced Team Splitter Service (FR-07)', () => {
  it('should return empty teams when no players provided', () => {
    const res = splitTeams([]);
    expect(res.teamA).toEqual([]);
    expect(res.teamB).toEqual([]);
    expect(res.ratingDiff).toBe(0);
  });

  it('should split 10 players into two equal teams of 5 with minimal rating difference', () => {
    const mockPlayers = [
      { id: '1', name: 'Player 1', skillRating: 1800, karmaScore: 95 },
      { id: '2', name: 'Player 2', skillRating: 1750, karmaScore: 90 },
      { id: '3', name: 'Player 3', skillRating: 1600, karmaScore: 85 },
      { id: '4', name: 'Player 4', skillRating: 1550, karmaScore: 80 },
      { id: '5', name: 'Player 5', skillRating: 1400, karmaScore: 100 },
      { id: '6', name: 'Player 6', skillRating: 1350, karmaScore: 90 },
      { id: '7', name: 'Player 7', skillRating: 1200, karmaScore: 75 },
      { id: '8', name: 'Player 8', skillRating: 1150, karmaScore: 85 },
      { id: '9', name: 'Player 9', skillRating: 1000, karmaScore: 95 },
      { id: '10', name: 'Player 10', skillRating: 950, karmaScore: 100 }
    ];

    const result = splitTeams(mockPlayers);

    expect(result.teamA.length).toBe(5);
    expect(result.teamB.length).toBe(5);
    // Selisih total power antar tim harus kecil (< 200 poin)
    expect(result.ratingDiff).toBeLessThan(200);
  });
});
