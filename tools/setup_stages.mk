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
# Build system stages
#
################################################################################

include setup_paths.mk

# Phony targets for build stages
.PHONY: checkout
.PHONY: build
.PHONY: test
.PHONY: install
.PHONY: all
.PHONE: clean
.PHONY: distclean

# Set the stage used when make is called with no arguments
all: install

################################################################################
#
# Build stage setup
#
# Dependency procedures must depend on these.
#
################################################################################

#
# Setup checkout stage
#

$(S)/.precheckout:
	mkdir -p "$(S)"
	mkdir -p "$(REPO_DIR)"

	touch "$@"

#
# Setup build stage
#

$(S)/.prebuild:
	mkdir -p "$(S)"
	mkdir -p "$(BUILD_DIR)"

	touch "$@"

#
# Setup test stage
#

$(S)/.pretest:
	mkdir -p "$(S)"

	touch "$@"

#
# Setup install stage
#

$(S)/.preinstall:
	mkdir -p "$(S)"
	mkdir -p "$(INSTALL_DIR)"

	# TODO: Remove when Hardhat hack is no longer required. See setup_paths.mk
	[ -L "$(HARDHAT_SEARCH_DIR)" ] || ln -s "$(INSTALL_DIR)" "$(HARDHAT_SEARCH_DIR)"

	touch "$@"
