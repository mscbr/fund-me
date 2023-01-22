import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import "dotenv/config";
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import { verify } from "../utils/verify";

const fundMe: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let ethUsdPriceFeedAddress;

  if (developmentChains.includes(network.name)) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  }

  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: [ethUsdPriceFeedAddress],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.GOERLI_PRIVATE_KEY
  ) {
    await verify(fundMe.address, [ethUsdPriceFeedAddress]);
  }

  log("-".repeat(50));
};

export default fundMe;

fundMe.tags = ["all", "fundme"];
