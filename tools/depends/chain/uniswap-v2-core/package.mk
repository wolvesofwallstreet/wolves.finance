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
UNISWAP_V2_CORE_REPO_NAME = uniswap-v2-core
UNISWAP_V2_CORE_VERSION = 4dd59067c76dea4a0e8e4bfdda41877a6b16dedc
UNISWAP_V2_CORE_REMOTE_REPO = https://github.com/Uniswap/$(UNISWAP_V2_CORE_REPO_NAME).git

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_UNISWAP_V2_CORE = $(REPO_DIR)/$(UNISWAP_V2_CORE_REPO_NAME)

# Build directory
BUILD_DIR_UNISWAP_V2_CORE = $(BUILD_DIR)/$(UNISWAP_V2_CORE_REPO_NAME)

# Install directory
INSTALL_DIR_UNISWAP_V2_CORE = $(INSTALL_DIR)/$(UNISWAP_V2_CORE_REPO_NAME)

################################################################################
#
# Configuration
#
################################################################################

UNISWAP_V2_CORE_BUILD_DEPENDS = \
  $(S)/checkout-uniswap-v2-core \

UNISWAP_V2_CORE_TEST_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/build-uniswap-v2-core \

UNISWAP_V2_CORE_INSTALL_DEPENDS = \

ifeq ($(TEST),1)
  UNISWAP_V2_CORE_INSTALL_DEPENDS += $(S)/test-uniswap-v2-core
else
  UNISWAP_V2_CORE_INSTALL_DEPENDS += $(S)/build-uniswap-v2-core
endif

################################################################################
#
# Checkout
#
################################################################################

$(S)/checkout-uniswap-v2-core: $(S)/.precheckout
	[ -d "$(REPO_DIR_UNISWAP_V2_CORE)" ] || ( \
	  git clone "$(UNISWAP_V2_CORE_REMOTE_REPO)" "$(REPO_DIR_UNISWAP_V2_CORE)" \
	)

	cd "$(REPO_DIR_UNISWAP_V2_CORE)" && \
	  git reset --hard $(UNISWAP_V2_CORE_VERSION)

	touch "$@"

################################################################################
#
# Build
#
################################################################################

$(S)/build-uniswap-v2-core: $(S)/.prebuild $(UNISWAP_V2_CORE_BUILD_DEPENDS)
	[ -d "$(BUILD_DIR_UNISWAP_V2_CORE)" ] || ( \
	  git clone "$(REPO_DIR_UNISWAP_V2_CORE)" "$(BUILD_DIR_UNISWAP_V2_CORE)" \
	)

	cd "$(BUILD_DIR_UNISWAP_V2_CORE)" && \
	  git reset --hard $(UNISWAP_V2_CORE_VERSION)

	touch "$@"

################################################################################
#
# Test
#
################################################################################

$(S)/test-uniswap-v2-core: $(S)/.pretest $(UNISWAP_V2_CORE_TEST_DEPENDS)
	# Install dependencies with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_CORE)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn install --mutex network

	# Compile with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_CORE)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn compile

	# Test with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_CORE)" && \
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

$(S)/install-uniswap-v2-core: $(S)/.preinstall $(UNISWAP_V2_CORE_INSTALL_DEPENDS)
	mkdir -p "$(INSTALL_DIR_UNISWAP_V2_CORE)"

	cp -r "$(BUILD_DIR_UNISWAP_V2_CORE)/contracts"/* "$(INSTALL_DIR_UNISWAP_V2_CORE)"

	# ...but don't include test contracts
	rm -rf "$(INSTALL_DIR_UNISWAP_V2_CORE)/test"

	touch "$@"
