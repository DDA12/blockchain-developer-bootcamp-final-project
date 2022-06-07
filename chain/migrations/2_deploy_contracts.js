const truffleConfig = require("../truffle-config.js")
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades')
const Registry = artifacts.require("Registry")

const DIDIregistry = artifacts.require("EthereumDIDRegistry")
const vcNFT = artifacts.require("vcNFT")

module.exports = async function (deployer, network, accounts) {
  // await deployer.deploy(vcNFT, "VcNFT", "VC", 'QmarPqdEuzh5RsWpyH2hZ3qSXBCzC5RyK3ZHnFkAsk7u2f');
  // await deployer.deploy(Registry);
  // const instanceRegistry = await Registry.deployed();


  // Check if Registry already deployed in the truffle artifact for the network (only one instance possible per blockChain): 
  // If so it is an upgrade of the implementation only (Registry.sol) for the specified network
  // assuming the proxy (ERC1967Proxy) has not changed (library OpenZepplin)
  // Exception: If the network == development, then it is assumed a fresh install (same as reset in truffle deploy) - creates a new proxy instance and deploys implementation if not already deployed
  // Use the network developmentUpgrade to upgrade the implementation only and not redeploy a new instance of the proxy
  const networkId = truffleConfig.networks?.[network]?.network_id
  const addressDeployed = Registry?.networks?.[networkId]?.address
  const registryIsAlreadyDeployed = (network != "development" && addressDeployed != undefined)

  let instanceRegistry
  if (!registryIsAlreadyDeployed) {
    instanceRegistry = await deployProxy(Registry, [], { deployer, kind: 'uups' })
    await deployer.deploy(vcNFT)
    const instancevcNFT = await vcNFT.deployed()
    const transaction = await instanceRegistry.addPortfolioSupport("vcNFT", instancevcNFT.address);
    } else {
    instanceRegistry = await upgradeProxy(addressDeployed, Registry, { deployer })
  }

  // Check if network == development to deploy the registry for a fresh install / intiial deployment.
  // Use the network developmentUpgrade to not redeploy the DIDRegistry
  if (network == "development") {
    await deployer.deploy(DIDIregistry, {overwrite: true})
  } else {
    await deployer.deploy(DIDIregistry, {overwrite: false})
  }
};
