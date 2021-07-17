#!/bin/bash
################################################################################
#
#  Copyright (C) 2021 The Wolfpack
#  This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE.txt for more information.
#
################################################################################

#
# Script to download static dependencies
#
# Requirements:
#
#   - curl
#

# Enable strict mode
set -o errexit
set -o pipefail
set -o nounset

#
# Environment configuration
#

# When this changes, update the version in slither.config.json
SOLC_VERSION="0.7.6"

SOLC_URL="https://github.com/ethereum/solidity/releases/download/v${SOLC_VERSION}/solc-static-linux"

#
# Environment paths
#

# Get the absolute path to this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Directory of the dependency build definitions
BIN_DIR="${SCRIPT_DIR}/bin"

# Name of solc binary
SOLC_BIN="solc-${SOLC_VERSION}"

# Final path of solc binary
SOLC_PATH="${BIN_DIR}/${SOLC_BIN}"

# Ensure directories exist
mkdir -p "${BIN_DIR}"

#
# Download dependencies
#

if [ -f "${SOLC_PATH}" ]; then
  echo "Using existing ${SOLC_BIN}"
else
  curl --location --output "${SOLC_PATH}" "${SOLC_URL}"
fi

#
# Set permissions
#

chmod +x "${SOLC_PATH}"
