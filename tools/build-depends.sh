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
# Build script for dependencies
#
# Requirements:
#
#   - git
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

# Directory of the dependency build definitions
DEPENDS_DIR="${SCRIPT_DIR}/depends"

# Directory of the downloaded repos
REPO_DIR="${SCRIPT_DIR}/repos"

# Directory for temporary build files
BUILD_DIR="${SCRIPT_DIR}/build"

# Root project directory
ROOT_DIR="${SCRIPT_DIR}/.."

# Contract directory
CONTRACT_DIR="${ROOT_DIR}/contracts"

# Depends install directory
INSTALL_DIR="${CONTRACT_DIR}/depends"

# Directory to place compiled bytecode
BYTECODE_DIR=${CONTRACT_DIR}/bytecode

# TODO: Hardhat fails to search relative to the sources directory (contracts/)
# and searches relative to root instead. For now, we just create a symlink.
HARDHAT_SEARCH_DIR="${ROOT_DIR}/depends"

# Ensure directories exist
mkdir -p "${REPO_DIR}"
mkdir -p "${INSTALL_DIR}"
mkdir -p "${BYTECODE_DIR}"
if [ ! -L "${HARDHAT_SEARCH_DIR}" ]; then
  ln -s "${INSTALL_DIR}" "${HARDHAT_SEARCH_DIR}"
fi

#
# Import dependencies
#

source "${DEPENDS_DIR}/chain/canonical-weth/package.sh"
source "${DEPENDS_DIR}/chain/convex-platform/package.sh"
source "${DEPENDS_DIR}/chain/curve-contracts/package.sh"
source "${DEPENDS_DIR}/chain/curve-dao-contracts/package.sh"
source "${DEPENDS_DIR}/chain/uniswap-lib/package.sh"
source "${DEPENDS_DIR}/chain/uniswap-v2-core/package.sh"
source "${DEPENDS_DIR}/chain/uniswap-v2-periphery/package.sh"
source "${DEPENDS_DIR}/chain/yearn-protocol/package.sh"

#
# Checkout dependencies
#

checkout_canonical_weth
checkout_convex
checkout_curve
checkout_curve_dao
checkout_uniswap_lib
checkout_uniswap_v2_core
checkout_uniswap_v2_periphery
checkout_yearn

#
# Build dependencies
#

build_canonical_weth
build_convex
build_curve
build_curve_dao
build_uniswap_lib
build_uniswap_v2_core
build_uniswap_v2_periphery
build_yearn

#
# Install dependencies
#

install_canonical_weth
install_convex
install_curve
install_curve_dao
install_uniswap_lib
install_uniswap_v2_core
install_uniswap_v2_periphery
install_yearn
