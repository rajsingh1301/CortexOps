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

# Install to /usr/local/bin (which is always in default system PATH)
INSTALLED_GLOBAL=false
if cp -f "${INSTALL_DIR}/cortexops" "/usr/local/bin/cortexops" 2>/dev/null; then
    chmod +x "/usr/local/bin/cortexops" 2>/dev/null || true
    INSTALLED_GLOBAL=true
elif command -v sudo >/dev/null 2>&1 && sudo -n cp -f "${INSTALL_DIR}/cortexops" "/usr/local/bin/cortexops" 2>/dev/null; then
    sudo -n chmod +x "/usr/local/bin/cortexops" 2>/dev/null || true
    INSTALLED_GLOBAL=true
fi

# Automatically add to shell RC file if not in PATH
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
fi

if [ -n "$SHELL_RC" ]; then
    if ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
        echo '' >> "$SHELL_RC"
        echo '# CortexOps CLI PATH' >> "$SHELL_RC"
        echo 'export PATH="$HOME/.local/bin:$HOME/go/bin:/usr/local/bin:$PATH"' >> "$SHELL_RC"
    fi
fi

echo ""
echo "✨ CortexOps CLI installed successfully!"
echo ""

# Launch CortexOps immediately in the current interactive shell
if [ -c /dev/tty ]; then
    export PATH="${INSTALL_DIR}:${HOME}/go/bin:${PATH}"
    exec "${INSTALL_DIR}/cortexops" "$@" < /dev/tty
else
    export PATH="${INSTALL_DIR}:${HOME}/go/bin:${PATH}"
    exec "${INSTALL_DIR}/cortexops" "$@"
fi
