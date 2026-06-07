# API de Pagamentos via Smart Contract com QR Code

## Visão Geral

Este documento descreve a arquitetura e funcionamento do servidor (API) que conecta o frontend **Voucher Social NFT** ao **smart contract ERC-1155** na blockchain Polygon para processamento de pagamentos via leitura de QR Code.

O sistema permite que beneficiários de programas sociais paguem em estabelecimentos credenciados utilizando vouchers digitais (NFTs) sem precisar entender qualquer conceito de blockchain ou criptomoedas.

---

## Arquitetura

```
┌─────────────────────┐       HTTP/JSON        ┌──────────────────────────┐
│   Frontend (Next.js) │ ──────────────────────▶ │  API Routes (Next.js)    │
│   - Carteira Web3    │ ◀────────────────────── │  app/api/*               │
│   - QR Scanner       │                         │                          │
│   - Voucher Service  │                         ├──────────────────────────┤
└─────────────────────┘                         │  Smart Contract Service  │
                                                 │  (viem)                  │
                                                 ├──────────────────────────┤
                                                 │  Merchant Registry       │
                                                 └─────────┬────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────────────┐
                                                 │  Blockchain (Polygon)    │
                                                 │  ERC-1155 (Vouchers)     │
                                                 └──────────────────────────┘
```

O frontend nunca se comunica diretamente com a blockchain. Todas as chamadas passam pela API, que:

1. **Autentica** cada requisição (carteira embutida do usuário)
2. **Valida** os dados (tipos de voucher, valores, endereços)
3. **Interage** com o contrato via `viem` (createWalletClient, writeContract)
4. **Retorna** respostas padronizadas em JSON

---

## Endpoints

### 1. Consultar Saldo dos Vouchers

```http
GET /api/vouchers/balance?address=0x...&type=alimentacao
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| address | `0x${string}` | Sim | Endereço da carteira do usuário |
| type | `alimentacao \| gas` | Não | Filtra por tipo (omita para ambos) |

**Resposta:**
```json
{
  "balances": [
    {
      "type": "alimentacao",
      "rawBalance": "15000",
      "formattedBalance": "150.00",
      "displayBalance": "R$ 150,00",
      "tokenId": "1"
    }
  ],
  "address": "0x..."
}
```

**Funcionamento:** Chama `balanceOf(account, tokenId)` no contrato ERC-1155.

---

### 2. Gerar QR Code de Pagamento

```http
POST /api/payments/generate-qr
Content-Type: application/json

{
  "voucherType": "alimentacao",
  "amount": "45,50",
  "fromAddress": "0x..."
}
```

**Resposta:**
```json
{
  "qrData": "{\"version\":1,\"type\":\"voucher_payment\",\"voucherType\":\"alimentacao\",\"amount\":\"45,50\",\"fromAddress\":\"0x...\",\"tokenId\":\"1\",\"transactionId\":\"TX-1712345678-ABC123\",\"expiresAt\":1712345738000,\"network\":\"polygon\"}",
  "expiresAt": 1712345738000,
  "transactionId": "TX-1712345678-ABC123"
}
```

O `qrData` é um JSON serializado que deve ser convertido em QR Code para o comerciante escanear.

---

### 3. Escanear QR do Comerciante (Simulado)

```http
POST /api/payments/scan-merchant
```

**Resposta:**
```json
{
  "merchantName": "Supermercado do Silva",
  "merchantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  "merchantLocation": "Rua das Flores, 123 - Centro",
  "amount": "R$ 45,50",
  "amountValue": "45,50",
  "voucherType": "alimentacao",
  "verified": true
}
```

**Funcionamento:** Simula a leitura de um QR Code exibido no caixa do comerciante. Em produção, substituir por leitura real de câmera.

---

### 4. Processar Pagamento

```http
POST /api/payments/process
Content-Type: application/json

{
  "fromAddress": "0x...",
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  "voucherType": "alimentacao",
  "amount": "45,50"
}
```

**Resposta (sucesso):**
```json
{
  "success": true,
  "transactionHash": "0xabcdef...1234567890abcdef...",
  "message": "Pagamento processado com sucesso na blockchain"
}
```

**Resposta (erro):**
```json
{
  "success": false,
  "error": "Revertido: saldo insuficiente"
}
```

**Funcionamento:** Executa `safeTransferFrom(from, to, tokenId, amount, data)` no contrato ERC-1155 usando a carteira admin como assinante. Aguarda confirmação da transação (`waitForTransactionReceipt`).

---

### 5. Verificar Comerciante

```http
GET /api/merchants/verify?address=0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18
```

**Resposta:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  "verified": true,
  "name": "Supermercado do Silva",
  "category": "alimentacao"
}
```

---

### 6. Listar Comerciantes

```http
GET /api/merchants/list?category=alimentacao
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| category | `alimentacao \| gas` | Não | Filtra por categoria |

**Resposta:**
```json
{
  "merchants": [
    {
      "id": "mercado-silva",
      "name": "Supermercado do Silva",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      "category": "alimentacao",
      "verified": true,
      "distance": "A 450m de voce",
      "location": "Rua das Flores, 123 - Centro"
    }
  ]
}
```

---

## Smart Contract

O sistema interage com um contrato **ERC-1155** (Multi-Token Standard) com a seguinte estrutura:

### Funções utilizadas

| Função | Descrição |
|--------|-----------|
| `balanceOf(account, id)` | Retorna o saldo de um token para um usuário |
| `safeTransferFrom(from, to, id, amount, data)` | Transfere tokens entre carteiras (pagamento) |
| `uri(id)` | Retorna a URI do metadata do token |

### Token IDs

| Token | ID | Descrição |
|-------|-----|-----------|
| Alimentação | `1` | Voucher de alimentação |
| Gás | `2` | Voucher de gás social |

### Segurança

- As transações `safeTransferFrom` são assinadas pela **carteira admin** (`CONTRACT_ADMIN_PRIVATE_KEY`), que precisa ter permissão para transferir tokens do usuário (via `setApprovalForAll` ou mecanismo similar).
- O valor é passado em **centavos** (2 decimais). Ex: `R$ 45,50` → `4550` no contrato.

---

## Fluxo de Pagamento

```
┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────┐
│ Usuário │     │ Frontend │     │  API Server  │     │  Blockchain │
└────┬────┘     └────┬─────┘     └──────┬───────┘     └──────┬──────┘
     │                │                  │                    │
     │  Escaneia QR   │                  │                    │
     │ do comerciante │                  │                    │
     │───────────────▶│  POST /scan      │                    │
     │                │─────────────────▶│                    │
     │                │◀─────────────────│                    │
     │                │  {merchant, valor}│                    │
     │  Confirma      │                  │                    │
     │  pagamento     │                  │                    │
     │───────────────▶│  POST /process   │                    │
     │                │─────────────────▶│  safeTransferFrom  │
     │                │                  │───────────────────▶│
     │                │                  │  Tx Receipt        │
     │                │                  │◀───────────────────│
     │                │◀─────────────────│                    │
     │  Pagamento OK  │  {txHash}        │                    │
     │◀───────────────│                  │                    │
┌────┴────┐     ┌────┴─────┐     ┌──────┴───────┐     ┌──────┴──────┐
│ Usuário │     │ Frontend │     │  API Server  │     │  Blockchain │
└─────────┘     └──────────┘     └──────────────┘     └─────────────┘
```

---

## Configuração de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Rede: 137 (Polygon mainnet) ou 80002 (Amoy testnet)
NEXT_PUBLIC_CHAIN_ID=137

# RPC da rede Polygon
RPC_URL=https://polygon-rpc.com

# Endereço do contrato ERC-1155 implantado
NEXT_PUBLIC_VOUCHER_CONTRACT_ADDRESS=0x...

# Chave privada da carteira admin (NUNCA compartilhar)
CONTRACT_ADMIN_PRIVATE_KEY=0x...
```

---

## Estrutura de Arquivos

```
lib/web3/
├── config.ts                    # Configuração da rede e ABI
├── embedded-wallet.ts           # Carteira embutida do usuário
├── index.ts                     # Barrel export
├── voucher-service.ts           # Serviço cliente (chama a API)
└── server/
    ├── smart-contract.ts        # Serviço server-side (viem + contrato)
    └── merchant-registry.ts     # Catálogo de comerciantes

app/api/
├── vouchers/
│   └── balance/
│       └── route.ts             # GET /api/vouchers/balance
├── payments/
│   ├── generate-qr/
│   │   └── route.ts             # POST /api/payments/generate-qr
│   ├── scan-merchant/
│   │   └── route.ts             # POST /api/payments/scan-merchant
│   └── process/
│       └── route.ts             # POST /api/payments/process
└── merchants/
    ├── list/
    │   └── route.ts             # GET /api/merchants/list
    └── verify/
        └── route.ts             # GET /api/merchants/verify
```

---

## Tecnologias

- **Next.js 16** — App Router com API Routes serverless
- **viem** — Interação com Ethereum/blockchain (leitura e escrita de contratos)
- **TypeScript** — Tipagem completa de ponta a ponta
- **ERC-1155** — Multi-Token Standard para vouchers
- **Polygon** — Rede de baixo custo para transações

---

## Próximos Passos (Produção)

1. **Implantar contrato real** — Fazer deploy do ERC-1155 em Polygon e atualizar `NEXT_PUBLIC_VOUCHER_CONTRACT_ADDRESS`
2. **QR Code real** — Substituir a simulação por leitura real via câmera do dispositivo
3. **Autenticação** — Implementar JWT ou session-based auth para proteger as APIs
4. **Rate limiting** — Prevenir abuso dos endpoints
5. **Webhook de confirmação** — Notificar o frontend quando a transação for confirmada
6. **Monitoramento** — Logs e métricas das transações
7. **Registro de comerciantes** — Integrar com contrato de registro on-chain
