import axios from 'axios';
import { ethers } from 'ethers';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const { chain, privateKey, amountIn, fromToken, toToken, slippage } = req.body;
    if (chain !== 'bsc') throw new Error('当前 Demo 仅支持 BSC');

    /* ---------- 1. 获取报价 ---------- */
    const quoteUrl = 'https://www.okx.com/api/v5/dex/aggregator/quote';
    const { data } = await axios.get(quoteUrl, {
      params: {
        chainId: 56,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount: amountIn,
        slippage,
        userWalletAddress: ethers.computeAddress(privateKey),
        swapMode: 'exactIn'
      }
    });
    if (data.code !== '00000') throw new Error(data.msg || 'Quote failed');

    const q = data.data;

    /* ---------- 2. 发送交易 ---------- */
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 如需 approve，请在此补充（略）

    const tx = await wallet.sendTransaction({
      to: q.routerAddress,
      data: q.data,
      value: q.value,
      gasLimit: q.gasLimit || 500000
    });
    await tx.wait(1);

    res.json({ txHash: tx.hash, chain: 'bsc' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
