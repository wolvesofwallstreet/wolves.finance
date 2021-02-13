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
# Canonical W-ETH package. See:
#
#   https://blog.0xproject.com/canonical-weth-a9aa7d0279dd)
#
# The version used here is v1.4.0, released 2019-02-28.
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
################################################################################

# Dependency name and version
WETH_REPO_NAME = canonical-weth
WETH_VERSION = 0dd1ea3e295eef916d0c6223ec63141137d22d67
WETH_REMOTE_REPO = https://github.com/gnosis/$(WETH_REPO_NAME).git

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_WETH = $(REPO_DIR)/$(WETH_REPO_NAME)

# Build directory
BUILD_DIR_WETH = $(BUILD_DIR)/$(WETH_REPO_NAME)

# Install directory
INSTALL_DIR_WETH = $(INSTALL_DIR)/$(WETH_REPO_NAME)

################################################################################
#
# Configuration
#
################################################################################

WETH_BUILD_DEPENDS = \
  $(S)/checkout-weth \

WETH_TEST_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/build-weth \

WETH_INSTALL_DEPENDS = \

ifeq ($(TEST),1)
  WETH_INSTALL_DEPENDS += $(S)/test-weth
else
  WETH_INSTALL_DEPENDS += $(S)/build-weth
endif

################################################################################
#
# Checkout
#
################################################################################

$(S)/checkout-weth: $(S)/.precheckout
	[ -d "$(REPO_DIR_WETH)" ] || ( \
	  git clone "$(WETH_REMOTE_REPO)" "$(REPO_DIR_WETH)" \
	)

	cd "$(REPO_DIR_WETH)" && \
	  git reset --hard $(WETH_VERSION)

	touch "$@"

################################################################################
#
# Build
#
################################################################################

$(S)/build-weth: $(S)/.prebuild $(WETH_BUILD_DEPENDS)
	[ -d "$(BUILD_DIR_WETH)" ] || ( \
	  git clone "$(REPO_DIR_WETH)" "$(BUILD_DIR_WETH)" \
	)

	cd "$(BUILD_DIR_WETH)" && \
	  git reset --hard $(WETH_VERSION)

	touch "$@"

################################################################################
#
# Test
#
################################################################################

$(S)/test-weth: $(S)/.preinstall $(WETH_TEST_DEPENDS)
	# Install dependencies with NPM
	cd "$(BUILD_DIR_WETH)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=10 && \
	  npm install

	# Compile with NPM
	cd "$(BUILD_DIR_WETH)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=10 && \
	  npm run build

	# Test with NPM
	cd "$(BUILD_DIR_WETH)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=10 && \
	  npm test

	touch "$@"

################################################################################
#
# Install
#
################################################################################

$(S)/install-weth: $(S)/.preinstall $(WETH_INSTALL_DEPENDS)
	mkdir -p "$(INSTALL_DIR_WETH)"

	cp -r "$(BUILD_DIR_WETH)/contracts"/* "$(INSTALL_DIR_WETH)"

	touch "$@"
