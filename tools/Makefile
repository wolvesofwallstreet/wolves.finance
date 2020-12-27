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
# Build chain for dependendies
#
# Make is used to run shell commands instead of bash to allow for parallel
# intermediary build stages.
#
# The primary build stages that can be specified on the command line are:
#
#   1. checkout
#   2. build
#   3. test (skipped if "TEST=0" is passed on the command line)
#   4. install (default if no stage is given)
#
# Two stages are used for cleaning temporary files:
#
#   1. clean
#   2. distclean
#
# "make clean" is used to remove temporary build artifacts. "make distclean" is
# used to remove all temporary files and reset the directory to an unused state.
#
# This Makefile depends on the following packages:
#
#   - bash
#   - patch
#   - wget
#
################################################################################

# Build system setup
include setup_stages.mk
include setup_paths.mk

# Define the shell used to execute commands
SHELL := /bin/bash

# Call make with "TEST=0" to skip dependency tests
TEST := 1

################################################################################
#
# Import package rules
#
################################################################################

include depends/native/canonical-weth/package.mk
include depends/native/nvm/package.mk

################################################################################
#
# Build system targets
#
# Defines the targets that are build when "make" is run.
#
################################################################################

#
# Define targets for "make checkout"
#

CHECKOUT_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/checkout-weth \

#
# Define targets for "make build"
#

BUILD_DEPENDS = \
  $(S)/build-weth \

#
# Define targets for "make test"
#

TEST_DEPENDS = \
  $(S)/test-weth \

#
# Define targets for "make install"
#

INSTALL_DEPENDS = \
  $(S)/install-weth \

#
# Inject targets
#

checkout: $(CHECKOUT_DEPENDS)
build: $(BUILD_DEPENDS)
test: $(TEST_DEPENDS)
install: $(INSTALL_DEPENDS)

#
# Define targets for building individual depends via "make <depend>"
#

.PHONY: nvm
.PHONY: weth

nvm: \
  $(S)/checkout-nvm

weth: \
  $(S)/install-weth

################################################################################
#
# Build system procedures
#
################################################################################

#
# Clean stage
#

clean:
	rm -rf "$(BUILD_DIR)"
	rm -rf "$(S)"

#
# Distclean stage
#

distclean: clean
	rm -rf "$(REPO_DIR)"
