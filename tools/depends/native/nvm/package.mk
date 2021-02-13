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
# Node Version Manager
#
# SPDX-License-Identifier: MIT
#
################################################################################

# Dependency name and version
NVM_REPO_NAME = nvm
NVM_VERSION = 0.37.0
NVM_INSTALL_SCRIPT = https://raw.githubusercontent.com/nvm-sh/$(NVM_REPO_NAME)/v$(NVM_VERSION)/install.sh
NVM_BIN = nvm-exec

################################################################################
#
# Paths
#
################################################################################

# Checkout directory
REPO_DIR_NVM = $(REPO_DIR)/$(NVM_REPO_NAME)

# Downloaded binary
NVM_BIN_PATH = $(REPO_DIR_NVM)/$(NVM_BIN)

################################################################################
#
# Checkout
#
################################################################################

$(NVM_BIN_PATH): $(S)/.precheckout
	mkdir -p "$(REPO_DIR_NVM)"

	[ -f "$(NVM_BIN_PATH)" ] || ( \
	  wget -qO- "$(NVM_INSTALL_SCRIPT)" | \
	    NVM_DIR="$(REPO_DIR_NVM)" \
	    PROFILE="/dev/null" \
	    bash \
	)

	touch "$@"

$(S)/checkout-nvm: $(NVM_BIN_PATH)
	# Set up NPM for required Node versions
	unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  nvm install 10 && \
	  nvm install 12

	# Set up yarn for Node 12
	unset npm_config_prefix && \
	  export NVM_DIR="$(REPO_DIR_NVM)" && \
	  source "$(REPO_DIR_NVM)/nvm.sh" && \
	  export NODE_VERSION=12 && \
	  npm install -g yarn

	touch "$@"
