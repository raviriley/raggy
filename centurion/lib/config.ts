export const FLARE_NETWORK = {
  id: 14,
  name: "Flare",
  network: "flare",
  nativeCurrency: {
    decimals: 18,
    name: "Flare",
    symbol: "FLR",
  },
  rpcUrls: {
    public: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
    default: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "FlareScan", url: "https://flarescan.com" },
  },
};

export const SPARKDEX_CONTRACTS = {
  router: "0x2Ef422F30cdb7a77f1077fE5D06E0D5D5517eE69",
  factory: "0x9fE0D8A02c517d6B25BE3617035B24C3882B1947",
};

export const FLARE_TOKENS = [
  {
    value: "flr",
    label: "Flare",
    icon: "FLR",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
  },
  {
    value: "wflr",
    label: "Wrapped Flare",
    icon: "WFLR",
    address: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
    decimals: 18,
  },
  {
    value: "sflr",
    label: "Staked FLR",
    icon: "sFLR",
    address: "0x12e605bc104e93b45e1ad99f9e555f659051c2bb",
    decimals: 18,
  },
  {
    value: "joule",
    label: "Joule",
    icon: "JOULE",
    address: "0xe6546a3beF8AE5Fd58C5d127efB0f3C94A9c2bE1",
    decimals: 18,
  },
  {
    value: "flreth",
    label: "Flare Staked ETH",
    icon: "flrETH",
    address: "0x8c5c1ab9b96ad885e2c5bd83d30f2d109ea20311",
    decimals: 18,
  },
  {
    value: "usdc.e",
    label: "Bridged USDC",
    icon: "USDC.e",
    address: "0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F",
    decimals: 6,
  },
  {
    value: "usdt",
    label: "Tether USD",
    icon: "USDT",
    address: "0x8aE32faE93a0f20890632EbD5F5A3b9f0A7B0Caa",
    decimals: 6,
  },
  {
    value: "weth",
    label: "Wrapped ETH",
    icon: "WETH",
    address: "0x717B7948E3A37fFd9Af7C5d4A0D48dF1c59a3C0F",
    decimals: 18,
  },
  {
    value: "xvn",
    label: "xHaven Token",
    icon: "XVN",
    address: "0x5f0197ba06860dac7e31258bdf749f92b6a636d4",
    decimals: 18,
  },
  {
    value: "cysflr",
    label: "Cyclo sFLR",
    icon: "cysFLR",
    address: "0x8cd69c359806af83120bc4b4e77663f1e31553e7",
    decimals: 18,
  },
  {
    value: "flreth",
    label: "Flare Staked ETH",
    icon: "flrETH",
    address: "0x8c5c1ab9b96ad885e2c5bd83d30f2d109ea20311",
    decimals: 18,
  },
  {
    value: "cusdx",
    label: "USDX T-POOL",
    icon: "cUSDX",
    address: "0x12e605bc104e93b45e1ad99f9e555f659051c2bb",
    decimals: 18,
  },
  {
    value: "cyweth",
    label: "Cyclo WETH",
    icon: "cyWETH",
    address: "0x9fE0D8A02c517d6B25BE3617035B24C3882B1947",
    decimals: 18,
  },
  {
    value: "pico",
    label: "PiCO Coin",
    icon: "PiCO",
    address: "0x2Ef422F30cdb7a77f1077fE5D06E0D5D5517eE69",
    decimals: 18,
  },
  {
    value: "finu",
    label: "FINU",
    icon: "FINU",
    address: "0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F",
    decimals: 18,
  },
  {
    value: "dinero",
    label: "Dinero",
    icon: "DINERO",
    address: "0x8aE32faE93a0f20890632EbD5F5A3b9f0A7B0Caa",
    decimals: 18,
  },
  {
    value: "rflr",
    label: "Reward FLR",
    icon: "rFLR",
    address: "0x717B7948E3A37fFd9Af7C5d4A0D48dF1c59a3C0F",
    decimals: 18,
  },
];
