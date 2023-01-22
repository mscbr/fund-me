import { assert, expect } from "chai";
import { network, deployments, ethers, getNamedAccounts } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendVal = ethers.utils.parseEther("1");

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructior", async function () {
        it("sets the aggregator addreses correctly", async function () {
          const resp = await fundMe.getPriceFeed();
          assert.equal(resp, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("Fails if you dont send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });

        it("updated the amount funded data structure", async function () {
          await fundMe.fund({ value: sendVal });
          const resp = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(resp.toString(), sendVal.toString());
        });

        it("adds funder to array of getFunder", async function () {
          await fundMe.fund({ value: sendVal });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendVal });
        });

        it("withdraw ETH from a singe founder", async function () {
          // Arrange
          const startingFMBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResp = await fundMe.withdraw();
          const transactionReceipt = await transactionResp.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endFMBalance = await fundMe.provider.getBalance(fundMe.address);
          const endDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endFMBalance, 0);
          assert.equal(
            startingFMBalance.add(startingDeployerBalance),
            endDeployerBalance.add(gasCost).toString()
          );
        });

        it("allows to withdraw with multiple founders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendVal });
          }

          const startingFMBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResp = await fundMe.withdraw();
          const transactionReceipt = await transactionResp.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endFMBalance = await fundMe.provider.getBalance(fundMe.address);
          const endDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endFMBalance, 0);
          assert.equal(
            startingFMBalance.add(startingDeployerBalance),
            endDeployerBalance.add(gasCost).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;
          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);

          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });

        it("CHEAP: withdraw ETH from a singe founder", async function () {
          // Arrange
          const startingFMBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResp = await fundMe.optimizedWithdraw();
          const transactionReceipt = await transactionResp.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endFMBalance = await fundMe.provider.getBalance(fundMe.address);
          const endDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endFMBalance, 0);
          assert.equal(
            startingFMBalance.add(startingDeployerBalance),
            endDeployerBalance.add(gasCost).toString()
          );
        });

        it("CHEAP: allows to withdraw with multiple founders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendVal });
          }

          const startingFMBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResp = await fundMe.optimizedWithdraw();
          const transactionReceipt = await transactionResp.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endFMBalance = await fundMe.provider.getBalance(fundMe.address);
          const endDeployerBalance = await fundMe.provider.getBalance(deployer);

          // Assert
          assert.equal(endFMBalance, 0);
          assert.equal(
            startingFMBalance.add(startingDeployerBalance),
            endDeployerBalance.add(gasCost).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;
          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("CHEAP: only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);

          await expect(
            attackerConnectedContract.optimizedWithdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });
      });
    });
