################################################################################
#
#  Copyright (C) 2020 The Wolfpack
#  This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
#
#  SPDX-License-Identifier: Apache-2.0
#  See the file LICENSE.txt for more information.
#
################################################################################

################################################################################
#
# Set paths for build system early setup
#
################################################################################

# Directory for tooling
TOOL_DIR = $(shell pwd)

# Directory of stamps for tracking build progress
STAMP_DIR = $(TOOL_DIR)/stamps

# Shorten variable name for Makefile stamp idiom
S = $(STAMP_DIR)

# Directory for storing dependency repositories
REPO_DIR = $(TOOL_DIR)/repos

# Directory of building dependencies
BUILD_DIR = $(TOOL_DIR)/build

# Directory to place smart contract dependencies
INSTALL_DIR = $(TOOL_DIR)/../contracts/depends

# TODO: Hardhat fails to search relative to the sources directory (contracts/)
# and searches relative to root instead. For now, we just create a symlink
# in setup_stages.mk.
HARDHAT_SEARCH_DIR = $(TOOL_DIR)/../depends
