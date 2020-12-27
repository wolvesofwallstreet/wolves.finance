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
# Unswap core contracts
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
################################################################################

# Dependency name and version
UNISWAP_CORE_REPO_NAME = uniswap-v2-core
UNISWAP_CORE_VERSION = 4dd59067c76dea4a0e8e4bfdda41877a6b16dedc
UNISWAP_CORE_REMOTE_REPO = https://github.com/Uniswap/$(UNISWAP_CORE_REPO_NAME).git

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_UNISWAP_CORE = $(REPO_DIR)/$(UNISWAP_CORE_REPO_NAME)

# Build directory
BUILD_DIR_UNISWAP_CORE = $(BUILD_DIR)/$(UNISWAP_CORE_REPO_NAME)

# Install directory
INSTALL_DIR_UNISWAP_CORE = $(INSTALL_DIR)/$(UNISWAP_CORE_REPO_NAME)

################################################################################
#
# Configuration
#
################################################################################

UNISWAP_CORE_BUILD_DEPENDS = \
  $(S)/checkout-uniswap-core \

UNISWAP_CORE_TEST_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/build-uniswap-core \

UNISWAP_CORE_INSTALL_DEPENDS = \

ifeq ($(TEST),1)
  UNISWAP_CORE_INSTALL_DEPENDS += $(S)/test-uniswap-core
else
  UNISWAP_CORE_INSTALL_DEPENDS += $(S)/build-uniswap-core
endif

################################################################################
#
# Checkout
#
################################################################################

$(S)/checkout-uniswap-core: $(S)/.precheckout
	[ -d "$(REPO_DIR_UNISWAP_CORE)" ] || ( \
	  git clone "$(UNISWAP_CORE_REMOTE_REPO)" "$(REPO_DIR_UNISWAP_CORE)" \
	)

	cd "$(REPO_DIR_UNISWAP_CORE)" && \
	  git reset --hard $(UNISWAP_CORE_VERSION)

	touch "$@"

################################################################################
#
# Build
#
################################################################################

$(S)/build-uniswap-core: $(S)/.prebuild $(UNISWAP_CORE_BUILD_DEPENDS)
	[ -d "$(BUILD_DIR_UNISWAP_CORE)" ] || ( \
	  git clone "$(REPO_DIR_UNISWAP_CORE)" "$(BUILD_DIR_UNISWAP_CORE)" \
	)

	cd "$(BUILD_DIR_UNISWAP_CORE)" && \
	  git reset --hard $(UNISWAP_CORE_VERSION)

	touch "$@"

################################################################################
#
# Test
#
################################################################################

$(S)/test-uniswap-core: $(S)/.preinstall $(UNISWAP_CORE_TEST_DEPENDS)
	# Install dependencies with yarn
	cd "$(BUILD_DIR_UNISWAP_CORE)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn install --mutex network

	# Compile with yarn
	cd "$(BUILD_DIR_UNISWAP_CORE)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn compile

	# Test with yarn
	cd "$(BUILD_DIR_UNISWAP_CORE)" && \
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

$(S)/install-uniswap-core: $(S)/.preinstall $(UNISWAP_CORE_INSTALL_DEPENDS)
	mkdir -p "$(INSTALL_DIR_UNISWAP_CORE)"

	cp -r "$(BUILD_DIR_UNISWAP_CORE)/contracts"/* "$(INSTALL_DIR_UNISWAP_CORE)"

	# ...but don't include test contracts
	rm -rf "$(INSTALL_DIR_UNISWAP_CORE)/test"

	touch "$@"
