# CortexOps CLI demo. Render from the repo root against the stack from docs/demo/setup.sh:
#   DEMO_BIN=<dir with cortexops> HOME=<DEMO_DIR>/home vhs docs/demo/demo.tape
Output docs/demo/demo.gif
Output docs/demo/demo.mp4

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 700
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 45ms
Set Framerate 24

Hide
Type "export PS1='$ ' PATH=$DEMO_BIN:$PATH CORTEXOPS_SKIP_ONBOARDING=true"
Enter
Type "clear"
Enter
Show

# 1. Cluster health
Type "cortexops status"
Enter
Sleep 3s

# 2. Interactive approval queue
Hide
Type "clear"
Enter
Show
Type "cortexops queue"
Enter
Sleep 2s
Down
Sleep 1s
Down
Sleep 1.5s
Up
Sleep 1.5s
Type "q"
Sleep 1s

# 3. Approve a whitelisted action (runs through the Safety Gate, ccloud in dry-run)
Hide
Type "clear"
Enter
Show
Type "cortexops approve a625baf7-1361-47a1-b468-75c0b9e18c10"
Enter
Sleep 4s

# 4. The Safety Gate rejects an action that is not on the allowlist
Hide
Type "clear"
Enter
Show
Type `curl -s localhost:5005/execute -d '{"actionType":"drop_database"}'`
Enter
Sleep 4s

# 5. Semantic memory
Hide
Type "clear"
Enter
Show
Type 'cortexops ask "why did you scale up the cluster?" -n 1'
Enter
Sleep 6s
