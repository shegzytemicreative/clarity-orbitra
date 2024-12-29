import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure property minting works correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'mint-property', [
        types.principal(wallet1.address),
        types.ascii("123 Main St, City, State"),
        types.uint(2000),
        types.ascii("Residential"),
        types.uint(2000)
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Verify property details
    let propertyBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'get-property-details', [
        types.uint(1)
      ], deployer.address)
    ]);
    
    let property = propertyBlock.receipts[0].result.expectOk().expectSome();
    assertEquals(property['owner'], wallet1.address);
    assertEquals(property['square-feet'], types.uint(2000));
  }
});

Clarinet.test({
  name: "Test fractional ownership creation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // First mint a property
    let mintBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'mint-property', [
        types.principal(wallet1.address),
        types.ascii("123 Main St, City, State"),
        types.uint(2000),
        types.ascii("Residential"),
        types.uint(2000)
      ], deployer.address)
    ]);
    
    // Create fractional ownership
    let fractionBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'create-fraction', [
        types.uint(1),
        types.principal(wallet2.address),
        types.uint(25)
      ], wallet1.address)
    ]);
    
    fractionBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Verify fractional ownership
    let ownershipBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'get-fractional-ownership', [
        types.uint(1),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    
    ownershipBlock.receipts[0].result.expectOk().expectSome().expectUint(25);
  }
});

Clarinet.test({
  name: "Ensure property transfer works",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Mint property
    let mintBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'mint-property', [
        types.principal(wallet1.address),
        types.ascii("123 Main St, City, State"),
        types.uint(2000),
        types.ascii("Residential"),
        types.uint(2000)
      ], deployer.address)
    ]);
    
    // Transfer property
    let transferBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'transfer-property', [
        types.uint(1),
        types.principal(wallet1.address),
        types.principal(wallet2.address)
      ], wallet1.address)
    ]);
    
    transferBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Verify new owner
    let propertyBlock = chain.mineBlock([
      Tx.contractCall('real_estate_token', 'get-property-details', [
        types.uint(1)
      ], deployer.address)
    ]);
    
    let property = propertyBlock.receipts[0].result.expectOk().expectSome();
    assertEquals(property['owner'], wallet2.address);
  }
});