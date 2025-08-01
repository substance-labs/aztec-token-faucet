import { AztecAddress, SponsoredFeePaymentMethod } from "@aztec/aztec.js"
import { TokenContract, TokenContractArtifact } from "@aztec/noir-contracts.js/Token"
import { BigNumber } from "bignumber.js"

import settings from "../settings/index.ts"
import { getNode, getPxe, getSponsoredFPCAddress, getWalletFromSecretKey } from "../utils/aztec.ts"

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

export interface RequestTokensBody {
  tokenAddress: string
  amount: string
  receiverAddress: string
  mode: "private" | "public"
}

async function requestTokens(
  fastify: FastifyInstance,
  req: FastifyRequest<{ Body: RequestTokensBody }>,
  reply: FastifyReply,
) {
  const { tokenAddress, amount, receiverAddress, mode } = req.body

  const token = settings.tokens.find(({ address }) => address.toLowerCase() === tokenAddress.toLowerCase())
  if (!token) return reply.status(400).send({ error: "Token not supported" })
  if (BigNumber(amount) > BigNumber(0.01).multipliedBy(10 ** token.decimals))
    return reply.status(400).send({ error: "Invalid amount" })

  const pxe = await getPxe(settings.rpcUrl)
  const paymentMethod = new SponsoredFeePaymentMethod(await getSponsoredFPCAddress())
  const wallet = await getWalletFromSecretKey({
    secretKey: process.env.AZTEC_SECRET_KEY as string,
    salt: process.env.AZTEC_KEY_SALT as string,
    pxe,
    deploy: false,
  })

  const contractInstance = await getNode(settings.rpcUrl).getContract(AztecAddress.fromString(tokenAddress))
  await pxe.registerContract({
    instance: contractInstance!,
    artifact: TokenContractArtifact,
  })

  const tokenContract = await TokenContract.at(AztecAddress.fromString(tokenAddress as string), wallet)

  let receipt
  if (mode === "private") {
    receipt = await tokenContract.methods
      .transfer(AztecAddress.fromString(receiverAddress), BigInt(amount))
      .send({
        fee: { paymentMethod },
      })
      .wait({
        timeout: 120000,
      })
  }
  if (mode === "public") {
    receipt = await tokenContract.methods
      .transfer_in_public(wallet.getAddress(), AztecAddress.fromString(receiverAddress), BigInt(amount), 0)
      .send({
        fee: { paymentMethod },
      })
      .wait({
        timeout: 120000,
      })
  }

  return {
    transactionHash: receipt?.txHash,
    senderAddress: wallet.getAddress().toString()
  }
}

function handler(fastify: FastifyInstance) {
  fastify.post("/request-tokens", (req, reply) =>
    requestTokens(fastify, req as FastifyRequest<{ Body: RequestTokensBody }>, reply),
  )
}

export default handler
