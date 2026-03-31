#!/usr/bin/env bash
#
# Claude Code Agent Team - Tmux Setup
#
# Usage:
#   ./scripts/agent-team.sh           # Start team with defaults
#   ./scripts/agent-team.sh "review frontend" "fix backend bugs" "run tests"
#   ./scripts/agent-team.sh --kill    # Kill all agent sessions
#
# Mỗi agent chạy trong 1 tmux pane riêng:
#   - Pane tự đóng khi agent xong (window close, agent vẫn chạy completion)
#   - Nhấn Ctrl+b + w để chọn pane muốn xem
#   - Nhấn Ctrl+b + d để detach (agents vẫn chạy ngầm)
#

set -euo pipefail

SESSION="claude-team"
WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Default agents ──
DEFAULT_AGENTS=(
  "frontend:Review all frontend components in src/ for bugs, accessibility, and performance issues. Output a summary."
  "backend:Review all server/ routes for security vulnerabilities, error handling, and best practices. Output a summary."
  "db:Analyze the database schema in server/db.ts and drizzle/ for missing indexes, normalization issues, and relationships. Output a summary."
)

# ── Helpers ──
info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

kill_team() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    ok "Killed session: $SESSION"
  else
    warn "Session '$SESSION' not running"
  fi
  exit 0
}

show_status() {
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    warn "Session '$SESSION' not running"
    return
  fi
  echo ""
  info "Agent Team Status — session: $SESSION"
  echo "──────────────────────────────────────────"
  tmux list-windows -t "$SESSION" -F "#{window_index}: #{window_name} (#{window_panes} panes)" 2>/dev/null
  echo ""
  info "Commands:"
  echo "  tmux attach -t $SESSION        # Attach to team"
  echo "  Ctrl+b + [0-9]                 # Switch to agent window"
  echo "  Ctrl+b + d                     # Detach (agents keep running)"
  echo "  ./scripts/agent-team.sh --kill # Kill all agents"
  echo ""
}

# ── Parse args ──
case "${1:-}" in
  --kill|-k)  kill_team ;;
  --status|-s) show_status; exit 0 ;;
  --help|-h)
    head -n 14 "$0" | tail -n 10
    exit 0
    ;;
esac

# ── Check prerequisites ──
if ! command -v tmux &>/dev/null; then
  err "tmux not found. Install: brew install tmux | apt install tmux"
  exit 1
fi

if ! command -v claude &>/dev/null; then
  err "claude CLI not found. Install: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

# ── Build agent list ──
agents=()

if [[ $# -gt 0 ]]; then
  # Custom prompts passed as args
  idx=0
  for prompt in "$@"; do
    agents+=("agent-${idx}:${prompt}")
    ((idx++))
  done
else
  # Use defaults
  agents=("${DEFAULT_AGENTS[@]}")
fi

# ── Kill existing session if any ──
if tmux has-session -t "$SESSION" 2>/dev/null; then
  warn "Session '$SESSION' exists, killing..."
  tmux kill-session -t "$SESSION"
fi

# ── Create tmux session ──
tmux new-session -d -s "$SESSION" -c "$WORKDIR" -x 200 -y 50

info "Creating ${#agents[@]} agent(s)..."

for entry in "${agents[@]}"; do
  name="${entry%%:*}"
  prompt="${entry#*:}"

  # Create new window for each agent
  tmux new-window -t "$SESSION" -n "$name" -c "$WORKDIR"

  # Run claude in headless print mode
  # --verbose shows progress; agent auto-exits when done
  # Pane closes automatically after completion
  tmux send-keys -t "$SESSION:$name" \
    "echo '${GREEN}▸ Agent: ${name}${NC}' && echo '${CYAN}▸ Task: ${prompt}${NC}' && echo '' && claude -p \"${prompt}\" && echo '' && echo '${GREEN}✓ Agent ${name} completed${NC}' && sleep 2 && tmux kill-window -t '$SESSION:$name' || echo '${RED}✗ Agent ${name} failed${NC}'" \
    Enter

  ok "Started: $name"
done

# Kill the initial blank window (index 0)
tmux kill-window -t "$SESSION:0" 2>/dev/null || true

echo ""
ok "Agent team started! Session: $SESSION"
echo ""
show_status
