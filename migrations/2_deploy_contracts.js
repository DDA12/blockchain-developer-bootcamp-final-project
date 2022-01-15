const vcNFT = artifacts.require("vcNFT.sol");
const registry = artifacts.require("Registry.sol");
const DIDIregistry = artifacts.require("EthereumDIDRegistry.sol");

const VcNFT = artifacts.require("vcNFT");
const Registry = artifacts.require("Registry");

module.exports = async function (deployer, network, accounts) {
  // await deployer.deploy(vcNFT, "VcNFT", "VC", 'QmarPqdEuzh5RsWpyH2hZ3qSXBCzC5RyK3ZHnFkAsk7u2f');
  await deployer.deploy(registry);
  const instanceRegistry = await Registry.deployed();
  const hashCreationCode = await instanceRegistry.getHashByteCode(VcNFT.bytecode);
  await instanceRegistry.addPortfolioSupport(VcNFT.contractName, hashCreationCode);
  if (network == "development") {
    await deployer.deploy(DIDIregistry, {overwrite: true});
  } else {
    await deployer.deploy(DIDIregistry, {overwrite: false});
  }
};
