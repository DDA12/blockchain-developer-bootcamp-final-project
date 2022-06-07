const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades')
const Registry = artifacts.require('Registry')
const VcNFT = artifacts.require('vcNFT')
const Beacon = artifacts.require('UpgradeableBeacon')

const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers')

// const { EthrDID } = require('ethr-did')

contract("Registry", accounts => {

    const [contractOwner, admin, notContractOwner, anybody, subject] = accounts

    beforeEach(async function() {
    });
    
    afterEach(function() {
    });

    describe("Upgradeable Registry - UUPS proxy pattern", () => {
        
      before(async function() {
        instanceRegisrty = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
        newRegistry = await Registry.new({ from: contractOwner })
        await newRegistry.initialize({ from: contractOwner })
      })

      it("default admin is contract owner", async () => {
        assert.equal(await instanceRegisrty.getAdmin({from: anybody}), contractOwner)
      })

      it("can't change admin when caller is not admin", async () => {
        await expectRevert(instanceRegisrty.changeAdmin(admin, {from: notContractOwner}),'Upgradeable: caller is not the admin');
      })

      it("change admin to new admin", async () => {
        const receipt  = await instanceRegisrty.changeAdmin(admin, {from: contractOwner});
        expectEvent(receipt , 'AdminChanged', {previousAdmin: contractOwner, newAdmin: admin})
        assert.equal(await instanceRegisrty.getAdmin({from: anybody}), admin)
      })

      it("can't upgrade Registry implementation when caller is not admin", async () => {
        const newRegistry = await Registry.new({ from: contractOwner })
        await expectRevert(instanceRegisrty.upgradeTo(newRegistry.address, {from: anybody}),'Upgradeable: caller is not the admin');
      })

      it("upgrade Registry implementation to new version", async () => {
        const newRegistry = await Registry.new({ from: contractOwner })
        await newRegistry.initialize({ from: contractOwner })
        const receipt  = await instanceRegisrty.upgradeTo(newRegistry.address, {from: admin})
        expectEvent(receipt , 'Upgraded', {implementation: newRegistry.address})
        assert.equal(await instanceRegisrty.getImplementation({from: anybody}), newRegistry.address)
      })

    })

    describe("Upgradeable Portfolio Contracts - Beacon proxy pattern", () => {
        
      before(async function() {
        instanceRegistry = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
        contractName = VcNFT.contractName;
        implementation = await VcNFT.new({ from: contractOwner })
        await instanceRegistry.addPortfolioSupport(contractName, implementation.address, {from: contractOwner})
      })

      it("can't upgrade Portfolio implementation when caller is not owner of Registry", async () => {
        const newImplementation = await VcNFT.new({ from: contractOwner })
        await expectRevert(instanceRegistry.upgradePortfolioSupport(contractName, newImplementation.address, {from: anybody}),'Ownable: caller is not the owner');
      })

      it("upgrade Portfolio implementation to new version thru Beacon", async () => {
        const newImplementation = await VcNFT.new({ from: contractOwner })
        const receipt  = await instanceRegistry.upgradePortfolioSupport(contractName, newImplementation.address, {from: contractOwner})
        expectEvent(receipt , 'Upgraded', {implementation: newImplementation.address})
        const beacon = await instanceRegistry.getBeaconPortoflioSupported(contractName, {from: anybody})
        const beaconInstance =await Beacon.at(beacon)
        assert.equal(await beaconInstance.implementation({from: anybody}), newImplementation.address)
      })

    })

    describe("Manage Portfolios Supported", () => {
        
        before(async function() {
          instance = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
          // instance = await Registry.new({ from: contractOwner })
          // instance.initialize({ from: contractOwner })
          // byteCode = VcNFT.bytecode;
          // hashCreationCode = await instance.getHashByteCode(byteCode)
          contractName = VcNFT.contractName;
          implementation = await VcNFT.new({ from: contractOwner })
        })

        it("can't add Portfolio Support when caller is not owner", async () => {
          await expectRevert(instance.addPortfolioSupport(contractName, implementation.address, {from: notContractOwner}),'Ownable: caller is not the owner')
        })

        it("can add Portfolio Support when caller is owner", async () => {
          await instance.addPortfolioSupport.call(contractName, implementation.address, {from: contractOwner})
        })

        it("confirms Portfolio Support added and event emitted", async () => {
          const receipt  = await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner})
          assert.equal(await instance.isPortoflioSupported.call(contractName, {from: contractOwner}), true)
          expectEvent(receipt , 'portfolioSupportAdded', {contractName, implementationAddress: implementation.address})
        })

        it("can't delete Portfolio Support when caller is not owner", async () => {
          await expectRevert(instance.delPortfolioSupport(contractName, {from: notContractOwner}),'Ownable: caller is not the owner')
        })

        it("can delete Portfolio Support when caller is owner", async () => {
          await instance.delPortfolioSupport.call(contractName, {from: contractOwner})
        })

        it("confirms Portfolio Support deleted and emits an event", async () => {
          const receipt  = await instance.delPortfolioSupport(contractName, {from: contractOwner})
          assert.equal(await instance.isPortoflioSupported.call(contractName, {from: contractOwner}), false)
          expectEvent(receipt , 'portfolioSupportDeleted', {contractName, implementationAddress: implementation.address})
        })

      })

      describe("Pause/Unpause Contract", () => {
        
        before(async function() {
          instance = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
          // instance = await Registry.new({ from: contractOwner })
          // instance.initialize({ from: contractOwner })
          byteCode = VcNFT.bytecode;
          hashCreationCode = await instance.getHashByteCode(byteCode)
          contractName = VcNFT.contractName;
        })

        it("Pause call reverts when caller is not owner", async() => {
          await expectRevert(instance.pause({ from: notContractOwner }),'Ownable: caller is not the owner');
        });

        it("Pause call emits an event when caller is owner and is successful", async() => {
          const receipt  = await instance.pause({ from: contractOwner });
          expectEvent(receipt , 'Paused', {account: contractOwner});
        });

        it("Unpause call reverts when caller is not owner", async() => {
          await expectRevert(instance.unpause({ from: notContractOwner }),'Ownable: caller is not the owner');
        });

        it("Unpause call emits an event when caller is owner and is successful", async() => {
          const receipt  = await instance.unpause({ from: contractOwner });
          expectEvent(receipt , 'Unpaused', {account: contractOwner});
        });

      })

      describe("Create and Register a Portfolio", () => {
        
        before(async function() {
          // byteCode = VcNFT.bytecode;
          contractName = VcNFT.contractName;
          implementation = await VcNFT.new({ from: contractOwner })
        })

        beforeEach(async function() {
          instance = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
          // instance = await Registry.new({ from: contractOwner })
          // instance.initialize({ from: contractOwner })
          // hashCreationCode = await instance.getHashByteCode(byteCode)
        })

        it("can't create a Portfolio if Portfolio not supported", async () => {
          await expectRevert(instance.createPortfolio(contractName, notContractOwner, "Test", "TST", "IPFS-CID",  { from: notContractOwner }),
                              'Registry: createPorfolio => Portfolio not supported');
        })

        it("can't create a Portfolio while Registry Contract is Paused", async () => {
          const receipt = await instance.pause( { from: contractOwner });
          await expectRevert(instance.createPortfolio(contractName, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner }),
                              'Pausable: paused');
        })

        it("creates and registers a Portfolio and returns the address where it is deployed", async () => {
          const receipt  = await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          assert.equal(web3.utils.isAddress(portfolioAddress), true);
        })

        it("creates and registers a Portfolio and emits events associated", async () => {
          await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          const receipt  = await instance.createPortfolio(contractName, notContractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          expectEvent(receipt , 'OwnershipTransferred', {previousOwner: constants.ZERO_ADDRESS, newOwner: instance.address});
          expectEvent(receipt , 'OwnershipTransferred', {previousOwner: instance.address, newOwner: notContractOwner});
          expectEvent(receipt , 'portfolioDeployed', {contractName, implementationAddress: implementation.address, portfolioAddress, owner: notContractOwner});
          expectEvent(receipt , 'portfolioRegistered', {contractName, implementationAddress: implementation.address, portfolioAddress, owner: notContractOwner});
        })

        it("creates and registers a Portfolio and confirms proper creation", async () => {
          await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(contractName, notContractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          const registered = await instance.isPortoflioRegistered(portfolioAddress);
          assert.equal(registered, true);
          const portfolioInstance = await VcNFT.at(portfolioAddress);
          const portfolioInfo = await portfolioInstance.portfolioInfo();
          assert.equal(portfolioInfo[0], notContractOwner);
          assert.equal(portfolioInfo[1],  "Test");
          assert.equal(portfolioInfo[2], "TST");
          assert.equal(portfolioInfo[3], "IPFS-CID");
          assert.equal(portfolioInfo[4].toNumber(), 0); //Total Suply of Portfolio
        })
        
        it("get all portfolios registered Call reverts while Registry Contract is paused", async () => {
          await instance.pause( { from: contractOwner });
          await expectRevert(instance.getAllPortofliosRegistered( { from: contractOwner }), 'Pausable: paused');
        })

      })

      describe("Unregister a Portfolio", () => {

        before(async function() {
          // byteCode = VcNFT.bytecode;
          contractName = VcNFT.contractName
          implementation = await VcNFT.new({ from: contractOwner })
        })

        beforeEach(async function() {
          instance = await deployProxy(Registry, [], { kind: 'uups'}) // default: { from: contractOwner }
          // instance = await Registry.new({ from: contractOwner })
          // instance.initialize({ from: contractOwner })
          // hashCreationCode = await instance.getHashByteCode(byteCode)
        })

        it("unregisters a Portfolio call reverts while Registry Contract is paused", async () => {
          await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(contractName, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          await instance.pause( { from: contractOwner });
          await expectRevert(instance.unregisterPortfolio(portfolioAddress, {from: notContractOwner}), "Pausable: paused");
        })

        it("unregisters a Portfolio call reverts if caller is not owner of portfolio or registry", async () => {
          await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(contractName, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          await expectRevert(instance.unregisterPortfolio(portfolioAddress, {from: anybody}), "Registry: unregisterPortfolio => caller is not the owner of Portfolio or Registry");
        })

        it("unregisters a Portfolio and emits an event", async () => {
          await instance.addPortfolioSupport(contractName, implementation.address, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(contractName, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(contractName, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          const receipt = await instance.unregisterPortfolio(portfolioAddress, {from: contractOwner});
          expectEvent(receipt , 'portfolioUnregistered', {portfolioAddress, owner: contractOwner});
        })

      });

})

contract("VcNFT", accounts => {
    const [contractOwner, notContractOwner, subject] = accounts;
    // const ownerEthrDid = new EthrDID({identifier: contractOwner});
    // const issuerDid = ownerEthrDid.did;
    // const subjectEthrDid = new EthrDID({identifier: subject});
    // const subjectDid = subjectEthrDid.did;

    before(() => {
    });

    after(() => {
    })
  
    describe("Create vcNFT Portfolio", () => {

      before(async () => {
        instance = await VcNFT.new({ from: contractOwner })
        receiptInitialize = await instance.initialize("test", 'TST', "IPFS-CID", { from: contractOwner })
      });
    
      after(() => {
      });

      it("Instance created with the correct parameters", async() => {
        assert.equal(await instance.name(), "test")
        assert.equal(await instance.symbol(), "TST")
        assert.equal(await instance.getPortfolioURI(), "IPFS-CID")
        assert.equal(await instance.totalSupply(), 0)
      });

      it("Instance created is owned by owner and events emitted", async() => {
        assert.equal(await instance.owner(), contractOwner)
        expectEvent(receiptInitialize, 'OwnershipTransferred', {previousOwner: constants.ZERO_ADDRESS, newOwner: contractOwner});        
        expectEvent(receiptInitialize, 'PortfolioURISet', {portfolioURI: "IPFS-CID"})
      });

      it("Instance created has no token", async() => {
        const tokenIds = await instance.getAllTokenIds()
        assert.equal(tokenIds.length, 0)
      });

    });

    describe("Pause/Unpause Contract", () => {
        
        before(async function() {
          instance = await VcNFT.new({ from: contractOwner })
          await instance.initialize("test", 'TST', "IPFS-CID", { from: contractOwner })
          })

        it("Pause call reverts when caller is not owner", async() => {
          await expectRevert(instance.pause({ from: notContractOwner }),'Ownable: caller is not the owner');
        });

        it("Pause call emits an event when caller is owner and is successful", async() => {
          const receipt  = await instance.pause({ from: contractOwner });
          expectEvent(receipt , 'Paused', {account: contractOwner});
        });

        it("Unpause call reverts when caller is not owner", async() => {
          await expectRevert(instance.unpause({ from: notContractOwner }),'Ownable: caller is not the owner');
        });

        it("Unpause call emits an event when caller is owner and is successful", async() => {
          const receipt  = await instance.unpause({ from: contractOwner });
          expectEvent(receipt , 'Unpaused', {account: contractOwner});
        });

      })

      describe("Certificate of Authenticity", () => {

        before(async function() {
          instance = await VcNFT.new({ from: contractOwner })
          await instance.initialize("test", 'TST', "IPFS-CID", { from: contractOwner })
          })

        it("Get Certificate of Authenticity URI for non existing tokenId reverts", async() => {
          await expectRevert(instance.getCoaURI(1),'VcNFT: getCoaURI => nonexistent token');
          await expectRevert(instance.tokenURI(12),'VcNFT: getCoaURI => nonexistent token');
        });

        it("Set Certificate of Authenticity URI callable only by to the Owner", async() => {
          await expectRevert(instance.setCoaURI(12, "IPFS-CID", { from: notContractOwner }),'Ownable: caller is not the owner');
        });

        it("Set Certificate of Authenticity URI for non existing tokenId reverts", async() => {
          await expectRevert(instance.setCoaURI(12, "IPFS-CID", { from: contractOwner }),'vcNFT: setCoaURI => nonexistent token');
        });

        it("Set Certificate of Authenticity URI emits an event when successful", async() => {
          await instance.mint(contractOwner, "IPFS-CID", { from: contractOwner });
          const receipt = await instance.setCoaURI(1, "IPFS-CID-NEW", { from: contractOwner });
          expectEvent(receipt, 'CoaURISet', {tokenId: '1', coaURI: "IPFS-CID-NEW"});
        });

        it("Set Certificate of Authenticity URI call reverts while the contract is paused", async() => {
          await instance.pause({ from: contractOwner })
          await expectRevert(instance.setCoaURI.call(12, "IPFS-CID", { from: contractOwner }),'Pausable: paused');
        });

    });

    describe("Minting an NFT", () => {

      beforeEach(async function() {
        instance = await VcNFT.new({ from: contractOwner })
        await instance.initialize("test", 'TST', "IPFS-CID", { from: contractOwner })
      })

      it("Minting call reverts when caller not owner", async() => {
        await expectRevert(instance.mint.call(contractOwner, "IPFS-CID", { from: notContractOwner }),'Ownable: caller is not the owner');
      });

      it("Minting call reverts while the contract is paused", async() => {
        await instance.pause({ from: contractOwner })
        await expectRevert(instance.mint.call(contractOwner, "IPFS-CID", { from: contractOwner }),'VcNFTPausable: _beforeTokenTransfer => token transfer while paused');
      });

      it("Mints an NFT and emits the asscoiated events", async() => {
        const receipt  = await instance.mint(contractOwner, "IPFS-CID", { from: contractOwner });
        expectEvent(receipt , 'Transfer', {from: constants.ZERO_ADDRESS, to: contractOwner, tokenId: '1'});
        expectEvent(receipt , 'CoaURISet', {tokenId: '1', coaURI: 'IPFS-CID'});
      });

      it("Mints an NFT and confirms proper creation", async() => {
        await instance.mint(contractOwner, "IPFS-CID", { from: contractOwner });
        const balanceOf = await instance.balanceOf.call(contractOwner);
        assert.equal(balanceOf.toString(), '1');
        const ownerOf = await instance.ownerOf.call(1);
        assert.equal(ownerOf.toString(), contractOwner);
        assert.equal(await instance.getCoaURI(1), "IPFS-CID");
      });

    });

    describe("Burning an NFT", () => {

      beforeEach(async function() {
        instance = await VcNFT.new({ from: contractOwner })
        await instance.initialize("test", 'TST', "IPFS-CID", { from: contractOwner })
      })

      it("Burning call reverts when caller is not owner", async() => {
        await expectRevert(instance.burn('1', { from: notContractOwner }),'Ownable: caller is not the owner');
      });

      it("Burning call reverts while the contract is paused", async() => {
        const receipt  = await instance.mint(contractOwner, "IPFS-CID", { from: contractOwner });
        await instance.pause({ from: contractOwner })
        await expectRevert(instance.burn('1', { from: contractOwner }),'VcNFTPausable: _beforeTokenTransfer => token transfer while paused');
      });

      it("Burning call reverts for non existing tokenId", async() => {
        await expectRevert(instance.burn.call('1', { from: contractOwner }), 'VcNFT: burn => nonexistent token');
      });

      it("Burning tokenId deletes all the necessary artifacts", async() => {
        await instance.mint(contractOwner, "IPFS-CID", { from: contractOwner });
        const receipt  = await instance.burn('1', { from: contractOwner });
        expectEvent(receipt , 'Transfer', {from: contractOwner, to: constants.ZERO_ADDRESS, tokenId: '1'});
        const balanceOf = await instance.balanceOf.call(contractOwner);
        assert.equal(balanceOf.toString(), '0');
        await expectRevert(instance.ownerOf(1),'ERC721: owner query for nonexistent token');
        await expectRevert(instance.getCoaURI(1),'VcNFT: getCoaURI => nonexistent token');
      });

    });

  });
