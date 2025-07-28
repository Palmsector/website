export function getCryptoAddress(crypto = "bitcoin") {
    const addresses = {
        "bitcoin": "bc1q5zr54nyn57x78anquumvka03awv4efu8j5qp92",
        "tron": "TSuZgT5maxwX5rYT5k2REp6tG74SLbscFb",
        "ethereum": "0x841b53C87a23E382957A8d1d4C5BA1C66a29C5E1",
        "trc20": "TSuZgT5maxwX5rYT5k2REp6tG74SLbscFb",
    };
    
    return addresses[crypto.toLowerCase()] || addresses["bitcoin"];
}