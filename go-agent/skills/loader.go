// Package skills loads CockroachDB's Agent Skills (installed via
// `npx skills add cockroachlabs/cockroachdb-skills`) and picks the
// relevant one(s) for a given situation, so the reasoning step in
// node-orchestrator consults real operational guidance instead of relying
// on the LLM's unguided judgment.
//
// Skills live as SKILL.md files with YAML frontmatter under
// ./skills-repo/skills/<domain>/<skill-name>/SKILL.md once installed.
package skills

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Skill struct {
	Name        string   `yaml:"name"`
	Domain      string   `yaml:"domain"`
	WhenToUse   []string `yaml:"when_to_use"` // trigger phrases/situations from frontmatter
	Body        string   `yaml:"-"`           // the markdown content after frontmatter
	FilePath    string   `yaml:"-"`
}

// Loader reads all installed skills once at startup and keeps them in
// memory — skills are static reference content, not something we expect
// to change during a run.
type Loader struct {
	RepoPath string
	skills   []Skill
}

func NewLoader(repoPath string) *Loader {
	return &Loader{RepoPath: repoPath}
}

// LoadAll walks the skills repo and parses every SKILL.md found.
func (l *Loader) LoadAll() error {
	var loaded []Skill

	err := filepath.Walk(l.RepoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() || filepath.Base(path) != "SKILL.md" {
			return nil
		}

		raw, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("reading %s: %w", path, err)
		}

		skill, err := parseSkillFile(string(raw))
		if err != nil {
			// Don't fail the whole load over one malformed skill file —
			// log and continue, since skills are advisory, not critical path.
			fmt.Printf("warning: failed to parse %s: %v\n", path, err)
			return nil
		}
		skill.FilePath = path
		// domain is the parent-of-parent directory name, e.g.
		// skills/performance-and-scaling/diagnose-cpu-spike/SKILL.md
		skill.Domain = filepath.Base(filepath.Dir(filepath.Dir(path)))
		loaded = append(loaded, skill)
		return nil
	})
	if err != nil {
		return err
	}

	l.skills = loaded
	return nil
}

// FindRelevant does simple keyword matching against `when_to_use` phrases
// and the situation description. Good enough for the hackathon; a real
// production version would embed skill descriptions and do a vector
// lookup the same way decisions.go does for the journal.
func (l *Loader) FindRelevant(situation string) []Skill {
	situation = strings.ToLower(situation)
	var matches []Skill

	for _, s := range l.skills {
		for _, trigger := range s.WhenToUse {
			if strings.Contains(situation, strings.ToLower(trigger)) {
				matches = append(matches, s)
				break
			}
		}
	}
	return matches
}

// parseSkillFile splits YAML frontmatter (between --- lines) from the
// markdown body.
func parseSkillFile(raw string) (Skill, error) {
	parts := strings.SplitN(raw, "---", 3)
	if len(parts) < 3 {
		return Skill{}, fmt.Errorf("no frontmatter found")
	}

	var skill Skill
	if err := yaml.Unmarshal([]byte(parts[1]), &skill); err != nil {
		return Skill{}, err
	}
	skill.Body = strings.TrimSpace(parts[2])
	return skill, nil
}
