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

# Ensure ~/.local/bin is in PATH for the user session
if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    echo ""
    echo "⚠️  Note: Add ${INSTALL_DIR} to your PATH if not already present:"
    echo '    export PATH="$HOME/.local/bin:$PATH"'
fi

echo ""
echo "✨ CortexOps CLI installed successfully to ${INSTALL_DIR}/cortexops!"
echo ""
echo "👉 Run the following command to get started:"
echo "   cortexops"
echo ""
