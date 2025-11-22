## Development
Place `.env` file in the packages where they are used, not in the root directory
```shell
$ pnpm install
$ pnpm dev
```
### to send tx as admin
connect to metamask with anvil default account
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

clientside still needs to clean up, rn, serve as display purpose

### comment on cooldown
all action cooldown is set to 0 rn, thus "anvil" without blocktime is ok to test