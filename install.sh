#!/usr/bin/env bash
# ============================================================================
# CortexOps CLI — One-Command Global Installer
# ============================================================================
set -e

echo "🚀 Installing CortexOps CLI..."

# Target install directory
INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "${INSTALL_DIR}"
mkdir -p "${HOME}/go/bin"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

if command -v go >/dev/null 2>&1; then
    echo "📦 Compiling latest cortexops with Go..."
    git clone --depth 1 https://github.com/rajsingh1301/CortexOps.git "${TMP_DIR}/cortexops-repo"
    cd "${TMP_DIR}/cortexops-repo/go-agent"
    go build -o "${INSTALL_DIR}/cortexops" ./cmd/cortexops/
    cp -f "${INSTALL_DIR}/cortexops" "${HOME}/go/bin/cortexops" 2>/dev/null || true
    chmod +x "${INSTALL_DIR}/cortexops"
else
    echo "❌ Error: Go (golang) is required to build CortexOps CLI."
    echo "👉 Please install Go from https://go.dev/dl/ and re-run this command."
    exit 1
fi

# Try copying to /usr/local/bin if writable
if [ -w "/usr/local/bin" ]; then
    cp -f "${INSTALL_DIR}/cortexops" "/usr/local/bin/cortexops" 2>/dev/null || true
fi

# Automatically add to shell RC file if not in PATH
SHELL_RC=""
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
fi

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    if [ -n "$SHELL_RC" ]; then
        if ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
            echo 'export PATH="$HOME/.local/bin:$HOME/go/bin:$PATH"' >> "$SHELL_RC"
            echo "🔧 Added ~/.local/bin to ${SHELL_RC}"
        fi
    fi
fi

echo ""
echo "✨ CortexOps CLI installed successfully!"
echo ""
echo "👉 To use it right now in this terminal window, run:"
echo '   export PATH="$HOME/.local/bin:$HOME/go/bin:$PATH"'
echo "   cortexops"
echo ""
