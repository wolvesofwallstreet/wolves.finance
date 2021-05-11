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
# Unswap peripheral contracts
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
################################################################################

# Dependency name and version
UNISWAP_V2_PERIPHERY_REPO_NAME = uniswap-v2-periphery
UNISWAP_V2_PERIPHERY_VERSION = dda62473e2da448bc9cb8f4514dadda4aeede5f4
UNISWAP_V2_PERIPHERY_REMOTE_REPO = https://github.com/Uniswap/$(UNISWAP_V2_PERIPHERY_REPO_NAME).git

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_UNISWAP_V2_PERIPHERY = $(REPO_DIR)/$(UNISWAP_V2_PERIPHERY_REPO_NAME)

# Build directory
BUILD_DIR_UNISWAP_V2_PERIPHERY = $(BUILD_DIR)/$(UNISWAP_V2_PERIPHERY_REPO_NAME)

# Install directory
INSTALL_DIR_UNISWAP_V2_PERIPHERY = $(INSTALL_DIR)/$(UNISWAP_V2_PERIPHERY_REPO_NAME)

################################################################################
#
# Configuration
#
################################################################################

UNISWAP_V2_PERIPHERY_BUILD_DEPENDS = \
  $(S)/checkout-uniswap-v2-periphery \
  $(S)/install-uniswap-lib \
  $(S)/install-uniswap-v2-core \

UNISWAP_V2_PERIPHERY_TEST_DEPENDS = \
  $(S)/checkout-nvm \
  $(S)/build-uniswap-v2-periphery \

UNISWAP_V2_PERIPHERY_INSTALL_DEPENDS = \

ifeq ($(TEST),1)
  UNISWAP_V2_PERIPHERY_INSTALL_DEPENDS += $(S)/test-uniswap-v2-periphery
else
  UNISWAP_V2_PERIPHERY_INSTALL_DEPENDS += $(S)/build-uniswap-v2-periphery
endif

################################################################################
#
# Checkout
#
################################################################################

$(S)/checkout-uniswap-v2-periphery: $(S)/.precheckout
	[ -d "$(REPO_DIR_UNISWAP_V2_PERIPHERY)" ] || ( \
	  git clone "$(UNISWAP_V2_PERIPHERY_REMOTE_REPO)" "$(REPO_DIR_UNISWAP_V2_PERIPHERY)" \
	)

	cd "$(REPO_DIR_UNISWAP_V2_PERIPHERY)" && \
	  git reset --hard $(UNISWAP_V2_PERIPHERY_VERSION)

	touch "$@"

################################################################################
#
# Build
#
################################################################################

$(S)/build-uniswap-v2-periphery: $(S)/.prebuild $(UNISWAP_V2_PERIPHERY_BUILD_DEPENDS)
	[ -d "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" ] || ( \
	  git clone "$(REPO_DIR_UNISWAP_V2_PERIPHERY)" "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" \
	)

	cd "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" && \
	  git reset --hard $(UNISWAP_V2_PERIPHERY_VERSION)

	patch \
	  -p1 \
	  --forward \
	  --directory="$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" \
	  --reject-file="/dev/null" \
	  --no-backup-if-mismatch \
	  < "$(TOOL_DIR)/depends/chain/uniswap-v2-periphery/0001-Remove-optimization-requiring-byte-identical-bytecod.patch" \
	  || : \

	patch \
	  -p1 \
	  --forward \
	  --directory="$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" \
	  --reject-file="/dev/null" \
	  --no-backup-if-mismatch \
	  < "$(TOOL_DIR)/depends/chain/uniswap-v2-periphery/0002-Delegate-import-locations-to-dependency-management.patch" \
	  || : \

	touch "$@"

################################################################################
#
# Test
#
################################################################################

$(S)/test-uniswap-v2-periphery: $(S)/.pretest $(UNISWAP_V2_PERIPHERY_TEST_DEPENDS)
	# Install dependencies with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn install --mutex network

	# Compile with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" && \
	  unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  yarn compile

	# Test with yarn
	cd "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)" && \
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

$(S)/install-uniswap-v2-periphery: $(S)/.preinstall $(UNISWAP_V2_PERIPHERY_INSTALL_DEPENDS)
	mkdir -p "$(INSTALL_DIR_UNISWAP_V2_PERIPHERY)"

	cp -r "$(BUILD_DIR_UNISWAP_V2_PERIPHERY)/contracts"/* "$(INSTALL_DIR_UNISWAP_V2_PERIPHERY)"

	# ...but don't include examples or test contracts
	rm -rf "$(INSTALL_DIR_UNISWAP_V2_PERIPHERY)/examples" \
	  "$(INSTALL_DIR_UNISWAP_V2_PERIPHERY)/test"

	touch "$@"
