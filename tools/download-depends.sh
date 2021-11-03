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
# Environment paths
#

# Get the absolute path to this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Directory of the dependency definitions
DEPENDS_DIR="${SCRIPT_DIR}/depends"

# Depends install directory
INSTALL_DIR="${SCRIPT_DIR}/bin"

# Ensure directories exist
mkdir -p "${INSTALL_DIR}"

#
# Import dependency definitions
#

source "${DEPENDS_DIR}/native/solidity/package.sh"

#
# Download dependencies
#

download_solidity
