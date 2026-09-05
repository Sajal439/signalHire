import { Octokit } from '@octokit/rest';

export async function fetchGithubProfile(accessToken: string): Promise<{ summary: string; username: string }> {
  const octokit = new Octokit({ auth: accessToken });

  const { data: user } = await octokit.users.getAuthenticated();
  const username = user.login;
  const name = user.name || user.login;
  const bio = user.bio || 'No bio provided.';

  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: 'pushed',
    per_page: 30,
    type: 'public',
  });

  const langCounts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
    }
  }

  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)
    .join(', ');

  const notableRepos = repos
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 5);

  let summary = `GitHub Profile: @${username} | ${name}\nBio: ${bio}\n\n`;
  if (topLanguages) {
    summary += `Top languages: ${topLanguages}\n\n`;
  }
  
  if (notableRepos.length > 0) {
    summary += `Notable projects:\n`;
    for (const repo of notableRepos) {
      const description = repo.description || 'No description';
      const lang = repo.language || 'Unknown';
      const stars = repo.stargazers_count || 0;
      summary += `- ${repo.name} (${lang}, ⭐${stars}): ${description}\n`;
    }
  } else {
    summary += `Notable projects: None found.\n`;
  }

  return { summary, username };
}
