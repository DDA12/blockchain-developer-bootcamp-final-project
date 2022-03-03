const VcNFT = artifacts.require('vcNFT');
const Registry = artifacts.require('Registry');

const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');

// const { EthrDID } = require('ethr-did');

contract("Registry", accounts => {

    const [contractOwner, notContractOwner, anybody, subject] = accounts;

    beforeEach(async function() {
    });
    
    afterEach(function() {
    });

    describe("Manage Portfolios (byte code) Supported", () => {
        
        before(async function() {
          instance = await Registry.new({ from: contractOwner });
          byteCode = VcNFT.bytecode;
          hashCreationCode = await instance.getHashByteCode(byteCode)
          contractName = VcNFT.contractName;
        })

        it("can't add Portfolio Support when caller is not owner", async () => {
          await expectRevert(instance.addPortfolioSupport(contractName, hashCreationCode, {from: notContractOwner}),'Ownable: caller is not the owner');
        })

        it("can add Portfolio Support when caller is owner", async () => {
          assert.equal(await instance.addPortfolioSupport.call(contractName, hashCreationCode, {from: contractOwner}), hashCreationCode);
        })

        it("confirms Portfolio Support added and event emitted", async () => {
          const receipt  = await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          assert.equal(await instance.isPortoflioSupported.call(contractName, hashCreationCode, {from: contractOwner}), true);
          expectEvent(receipt , 'portfolioSupportAdded', {contractName, hashCreationCode});
        })

        it("can't delete Portfolio Support when caller is not owner", async () => {
          await expectRevert(instance.delPortfolioSupport(contractName, hashCreationCode, {from: notContractOwner}),'Ownable: caller is not the owner');
        })

        it("can delete Portfolio Support when caller is owner", async () => {
          assert.equal(await instance.delPortfolioSupport.call(contractName, hashCreationCode, {from: contractOwner}), true);
        })

        it("confirms Portfolio Support deleted and emits an event", async () => {
          const receipt  = await instance.delPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          assert.equal(await instance.isPortoflioSupported.call(contractName, hashCreationCode, {from: contractOwner}), false);
          expectEvent(receipt , 'portfolioSupportDeleted', {contractName, hashCreationCode});
        })

      })

      describe("Pause/Unpause Contract", () => {
        
        before(async function() {
          instance = await Registry.new({ from: contractOwner });
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
          byteCode = VcNFT.bytecode;
          contractName = VcNFT.contractName;
        })

        beforeEach(async function() {
          instance = await Registry.new({ from: contractOwner });
          hashCreationCode = await instance.getHashByteCode(byteCode)
        })

        it("can't create a Portfolio if Portfolio not supported", async () => {
          await expectRevert(instance.createPortfolio(byteCode, notContractOwner, "Test", "TST", "IPFS-CID",  { from: notContractOwner }),
                              'Registry: createPorfolio => Portfolio (byteCode) not supported');
        })

        it("can't create a Portfolio while Registry Contract is Paused", async () => {
          const receipt   = await instance.pause( { from: contractOwner });
          await expectRevert(instance.createPortfolio(byteCode, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner }),
                              'Pausable: paused');
        })

        it("creates and registers a Portfolio and returns the address where it is deployed", async () => {
          const receipt  = await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          assert.equal(web3.utils.isAddress(portfolioAddress), true);
        })

        it("creates and registers a Portfolio and emits events associated", async () => {
          await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          const receipt  = await instance.createPortfolio(byteCode, notContractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          expectEvent(receipt , 'OwnershipTransferred', {previousOwner: constants.ZERO_ADDRESS, newOwner: instance.address});
          expectEvent(receipt , 'OwnershipTransferred', {previousOwner: instance.address, newOwner: notContractOwner});
          expectEvent(receipt , 'portfolioDeployed', {contractName, hashCreationCode, portfolioAddress, salt: web3.eth.abi.encodeParameter('int256', String(1)), owner: notContractOwner});
          expectEvent(receipt , 'portfolioRegistered', {contractName, hashCreationCode, portfolioAddress, owner: notContractOwner});
        })

        it("creates and registers a Portfolio and confirms proper creation", async () => {
          await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, notContractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(byteCode, notContractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          const registered = await instance.isPortoflioRegistered(portfolioAddress);
          assert.equal(registered, true);
          const portfolioInstance = await VcNFT.at(portfolioAddress);
          const portfolioInfo = await portfolioInstance.portfolioInfo();
          assert.equal(portfolioInfo[0], notContractOwner);
          assert.equal(portfolioInfo[1],  "Test");
          assert.equal(portfolioInfo[2], "TST");
          assert.equal(portfolioInfo[3], "IPFS-CID");
          assert.equal(portfolioInfo[4].toNumber(), 0); //Total Suply of  Portfolio
        })
        
        it("get all portfolios registered Call reverts while Registry Contract is paused", async () => {
          await instance.pause( { from: contractOwner });
          await expectRevert(instance.getAllPortofliosRegistered( { from: contractOwner }), 'Pausable: paused');
        })

      })

      describe("Unregister a Portfolio", () => {

        before(async function() {
          byteCode = VcNFT.bytecode;
          contractName = VcNFT.contractName;
        })

        beforeEach(async function() {
          instance = await Registry.new({ from: contractOwner });
          hashCreationCode = await instance.getHashByteCode(byteCode)
        })

        it("unregisters a Portfolio call reverts while Registry Contract is paused", async () => {
          await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(byteCode, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          await instance.pause( { from: contractOwner });
          await expectRevert(instance.unregisterPortfolio(portfolioAddress, {from: notContractOwner}), "Pausable: paused");
        })

        it("unregisters a Portfolio call reverts if caller is not owner of portfolio or registry", async () => {
          await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(byteCode, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
          await expectRevert(instance.unregisterPortfolio(portfolioAddress, {from: anybody}), "Registry: unregisterPortfolio => caller is not the owner of Portfolio or Registry");
        })

        it("unregisters a Portfolio and emits an event", async () => {
          await instance.addPortfolioSupport(contractName, hashCreationCode, {from: contractOwner});
          const portfolioAddress = await instance.createPortfolio.call(byteCode, contractOwner, "Test", "TST", "IPFS-CID",  { from: contractOwner });
          await instance.createPortfolio(byteCode, contractOwner, "Test", 'TST', "IPFS-CID",  { from: contractOwner });
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

      beforeEach(async () => {
        instance = await VcNFT.new("test", 'TST', "IPFS-CID", { from: contractOwner });
      });
    
      afterEach(() => {
      });

      it("Instance created with the correct parameters", async() => {
        assert.equal(await instance.name(), "test");
        assert.equal(await instance.symbol(), "TST");
        assert.equal(await instance.getPortfolioURI(), "IPFS-CID");
        assert.equal(await instance.totalSupply(), 0);
      });

      it("Instance created is owned by owner and events emitted", async() => {
        assert.equal(await instance.owner(), contractOwner);
        expectEvent.inConstruction(instance, 'OwnershipTransferred', {previousOwner: constants.ZERO_ADDRESS, newOwner: contractOwner});        
        expectEvent.inConstruction(instance, 'PortfolioURISet', {portfolioURI: "IPFS-CID"});
      });

      it("Instance created has no token", async() => {
        const tokenIds = await instance.getAllTokenIds();
        assert.equal(tokenIds.length, 0);
      });

    });

    describe("Pause/Unpause Contract", () => {
        
        before(async function() {
          instance = await VcNFT.new("test", 'TST', "IPFS-CID", { from: contractOwner });
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
          instance = await VcNFT.new("test", 'TST', "IPFS-CID", { from: contractOwner });
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
        instance = await VcNFT.new("test", 'TST', "IPFS-CID", { from: contractOwner });
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
        instance = await VcNFT.new("test", 'TST', "IPFS-CID", { from: contractOwner });
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
