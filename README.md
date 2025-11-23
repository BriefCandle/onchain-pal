## Development
Place `.env` file in the packages where they are used, not in the root directory
for example, in package/contract-client, put admin_private_key for admin wallet

### to ensure send tx as admin
anvil private key
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
in apps/agent, need to put openrounter, deepseek, api 

### for local development
first, 
```shell
$ pnpm install
```
then, setup config for local contract address and rpc

finally

```shell
$ pnpm install
$ pnpm dev
```


