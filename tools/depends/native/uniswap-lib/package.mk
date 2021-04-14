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
# Solidity libraries that are shared across Uniswap contracts
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
################################################################################

# Dependency name and version
UNISWAP_LIB_REPO_NAME = uniswap-lib
UNISWAP_LIB_VERSION = c01640b0f0f1d8a85cba8de378cc48469fcfd9a6
UNISWAP_LIB_REMOTE_REPO = https://github.com/Uniswap/$(UNISWAP_LIB_REPO_NAME).git

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_UNISWAP_LIB = $(REPO_DIR)/$(UNISWAP_LIB_REPO_NAME)

# Build directory
BUILD_DIR_UNISWAP_LIB = $(BUILD_DIR)/$(UNISWAP_LIB_REPO_NAME)

# Install directory
INSTALL_DIR_UNISWAP_LIB = $(INSTALL_DIR)/$(UNISWAP_LIB_REPO_NAME)

################################################################################
#
# Configuration
#
################################################################################

UNISWAP_LIB_BUILD_DEPENDS = \
  $(S)/checkout-uniswap-lib \

UNISWAP_LIB_TEST_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/build-uniswap-lib \

UNISWAP_LIB_INSTALL_DEPENDS = \

ifeq ($(TEST),1)
  UNISWAP_LIB_INSTALL_DEPENDS += $(S)/test-uniswap-lib
else
  UNISWAP_LIB_INSTALL_DEPENDS += $(S)/build-uniswap-lib
endif

################################################################################
#
# Checkout
#
################################################################################

$(S)/checkout-uniswap-lib: $(S)/.precheckout
	[ -d "$(REPO_DIR_UNISWAP_LIB)" ] || ( \
	  git clone "$(UNISWAP_LIB_REMOTE_REPO)" "$(REPO_DIR_UNISWAP_LIB)" \
	)

	cd "$(REPO_DIR_UNISWAP_LIB)" && \
	  git reset --hard $(UNISWAP_LIB_VERSION)

	touch "$@"

################################################################################
#
# Build
#
################################################################################

$(S)/build-uniswap-lib: $(S)/.prebuild $(UNISWAP_LIB_BUILD_DEPENDS)
	[ -d "$(BUILD_DIR_UNISWAP_LIB)" ] || ( \
	  git clone "$(REPO_DIR_UNISWAP_LIB)" "$(BUILD_DIR_UNISWAP_LIB)" \
	)

	cd "$(BUILD_DIR_UNISWAP_LIB)" && \
	  git reset --hard $(UNISWAP_LIB_VERSION)

	touch "$@"

################################################################################
#
# Test
#
################################################################################

$(S)/test-uniswap-lib: $(S)/.preinstall $(UNISWAP_LIB_TEST_DEPENDS)
	# Install dependencies with yarn
	cd "$(BUILD_DIR_UNISWAP_LIB)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn install --mutex network

	# Compile with yarn
	cd "$(BUILD_DIR_UNISWAP_LIB)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn compile

	# Test with yarn
	cd "$(BUILD_DIR_UNISWAP_LIB)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn test

	touch "$@"

################################################################################
#
# Install
#
################################################################################

$(S)/install-uniswap-lib: $(S)/.preinstall $(UNISWAP_LIB_INSTALL_DEPENDS)
	mkdir -p "$(INSTALL_DIR_UNISWAP_LIB)"

	cp -r "$(BUILD_DIR_UNISWAP_LIB)/contracts"/* "$(INSTALL_DIR_UNISWAP_LIB)"

	# ...but don't include test contracts
	rm -rf "$(INSTALL_DIR_UNISWAP_LIB)/test"

	touch "$@"
