/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-unused-expressions: "off" */

import * as dagPB from '@ipld/dag-pb';
import { MemoryBlockstore } from 'blockstore-core/memory';
import chai from 'chai';
import { MemoryDatastore } from 'datastore-core/memory';
import fs from 'fs';
import * as IPFS from 'ipfs-core';
import { IPFS as IPFSType } from 'ipfs-core-types';
import { createRepo } from 'ipfs-repo';
import tempDir from 'ipfs-utils/src/temp-dir.js';
import { BlockCodec } from 'multiformats/codecs/interface';

describe('IPFS', function () {
  let ipfsNode: IPFSType = null;

  // Bootstraps IPFS and transfers control to our entry points
  async function bootstrapIPFS(): Promise<IPFSType> {
    const dir = tempDir();
    fs.mkdirSync(dir);

    const memoryDs = new MemoryDatastore();
    const memoryBs = new MemoryBlockstore();

    // IPFS options
    // Configuration for running offline comes from:
    //   https://github.com/ipfs/js-ipfs/issues/3923#issuecomment-950778157
    const options = {
      offline: true,
      silent: true,
      preload: {
        enabled: false,
      },
      config: {
        Discovery: {
          MDNS: {
            Enabled: false,
          },
          webRTCStar: {
            Enabled: false,
          },
        },
      },
      libp2p: {
        peerStore: {
          persistence: false,
        },
        config: {
          peerDiscovery: {
            autoDial: false,
          },
        },
      },
      repo: createRepo(
        dir,
        (codeOrName) => {
          const lookup: Record<string, BlockCodec<number, unknown>> = {
            [dagPB.code]: dagPB,
            [dagPB.name]: dagPB,
          };

          return Promise.resolve(lookup[codeOrName]);
        },
        {
          root: memoryDs,
          blocks: memoryBs,
          keys: memoryDs,
          datastore: memoryDs,
          pins: memoryDs,
        },
        {
          repoLock: {
            lock: async () => ({
              close: async () => {
                return;
              },
            }),
            locked: async () => false,
          },
          autoMigrate: false,
        }
      ),
      EXPERIMENTAL: {
        ipnsPubsub: true,
      },
    };

    // Create IPFS node
    const node: IPFSType = await IPFS.create(options);

    //
    // IPFS is ready to use!
    // See https://github.com/ipfs/js-ipfs#core-api
    //

    return node;
  }

  before(async function () {
    ipfsNode = await bootstrapIPFS();
  });

  after(async function () {
    if (ipfsNode) {
      await ipfsNode.stop();
      ipfsNode = null;
    }
  });

  it('should have a version', async function () {
    const version = await ipfsNode.version();

    chai.expect(version.version).to.be.a('string');
  });

  it('should be online', async function () {
    chai.expect(ipfsNode.isOnline()).to.be.true;
  });
});
