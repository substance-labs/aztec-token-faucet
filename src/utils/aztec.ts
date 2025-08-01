import { Fr, getContractInstanceFromDeployParams, createAztecNodeClient, waitForPXE } from "@aztec/aztec.js"
import { createStore } from "@aztec/kv-store/lmdb"
import { getPXEServiceConfig } from "@aztec/pxe/config"
import { createPXEService } from "@aztec/pxe/server"
import { getSchnorrAccount, SchnorrAccountContractArtifact } from "@aztec/accounts/schnorr"
import { deriveSigningKey } from "@aztec/stdlib/keys"
import { SponsoredFPCContractArtifact, SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC"

import type { LogFn } from "@aztec/foundation/log"
import type { ContractInstanceWithAddress, Wallet, PXE, FeePaymentMethod } from "@aztec/aztec.js"

const SPONSORED_FPC_SALT = new Fr(0)

export async function getSponsoredFPCInstance(): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromDeployParams(SponsoredFPCContract.artifact, {
    salt: SPONSORED_FPC_SALT,
  })
}

export async function getSponsoredFPCAddress() {
  return (await getSponsoredFPCInstance()).address
}

export async function setupSponsoredFPC(deployer: Wallet, log: LogFn) {
  const deployed = await SponsoredFPCContract.deploy(deployer)
    .send({ contractAddressSalt: SPONSORED_FPC_SALT, universalDeploy: true })
    .deployed()

  log(`SponsoredFPC: ${deployed.address}`)
}

export async function getDeployedSponsoredFPCAddress(pxe: PXE) {
  const fpc = await getSponsoredFPCAddress()
  const contracts = await pxe.getContracts()
  if (!contracts.find((c: any) => c.equals(fpc))) {
    throw new Error("SponsoredFPC not deployed.")
  }
  return fpc
}

export const getNode = (pxeUrl: string) => createAztecNodeClient(pxeUrl)

export const getPxe = async (pxeUrl: string) => {
  const node = getNode(pxeUrl)
  const fullConfig = {
    ...getPXEServiceConfig(),
    l1Contracts: await node.getL1ContractAddresses(),
    proverEnabled: true,
  }
  const store = await createStore(process.env.PXE_STORE_NAME ?? "pxe", {
    dataDirectory: "store",
    dataStoreMapSizeKB: 1e6,
  })
  const pxe = await createPXEService(node, fullConfig, {
    store,
    useLogSuffix: true,
  })
  await waitForPXE(pxe)

  const fpcContractInstance = await getSponsoredFPCInstance()
  await pxe.registerContract({
    instance: fpcContractInstance,
    artifact: SponsoredFPCContractArtifact,
  })

  return pxe
}

export const getWalletFromSecretKey = async ({
  paymentMethod,
  pxe,
  secretKey: sk,
  deploy = false,
  salt: s,
}: {
  secretKey: string
  paymentMethod?: FeePaymentMethod
  pxe: PXE
  deploy?: boolean
  salt: string
}) => {
  const salt = Fr.fromHexString(s)
  const secretKey = Fr.fromHexString(sk)
  const signingKey = deriveSigningKey(secretKey)
  const account = await getSchnorrAccount(pxe, secretKey, signingKey, salt)
  if (deploy) await account.deploy({ fee: { paymentMethod } }).wait()
  const wallet = await account.getWallet()
  await pxe.registerAccount(secretKey, (await wallet.getCompleteAddress()).partialAddress)
  await pxe.registerContract({
    instance: account.getInstance(),
    artifact: SchnorrAccountContractArtifact,
  })
  return wallet
}
