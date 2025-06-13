import jose from "node-jose";
import { Keys } from "../schema/keys.js";
import { Document } from "mongoose";

/**
 *
 * @returns key data, unencrypted
 */
export const rotateKey = async () => {
  const keystore = jose.JWK.createKeyStore();
  const newKey = await keystore.generate("oct", 256, {
    alg: "A256GCM",
    use: "enc",
  });

  await Keys.create({
    kid: newKey.kid,
    kdata: JSON.stringify(newKey.toJSON(true)),
  });

  console.log("New encryption key generated: \x1b[32m%s\x1b[0m", newKey.kid);
  return newKey;
};

type Key = {
  kid: string;
  kdata: string;
  createdAt?: Date;
} & Document;

export const getKey = async () => {
  try {
    // encryption keys for the data key, sort by oldest
    const enckeys = await Keys.find<Key>().sort({
      createdAt: -1,
    });
    // data/main key to encrypt customer data with
    const datakey = enckeys.pop();
    // key store for encryption keys
    const enckeystore = jose.JWK.createKeyStore();

    // if there are no keys, generate a new one
    if (!enckeys.length) {
      const data = await jose.JWK.asKey(await rotateKey(), "json");
      await enckeystore.add(data);
    } else {
      // add all enc keys to the keystore
      for (const key of enckeys) {
        const data = await jose.JWK.asKey(JSON.parse(key.kdata), "json");
        await enckeystore.add(data);
      }

      // if the oldest key is older than 1 days, create a new one
      if (
        Date.now() - (enckeys[0].createdAt?.getTime() ?? Date.now()) >=
        24 * 60 * 60 * 1000
      ) {
        const newKey = await rotateKey();
        // decrypt the data key to reencrypt
        const kd = await jose.JWE.createDecrypt(enckeystore).decrypt(
          datakey!.kdata
        );
        // the key's data
        const kdata = kd.plaintext.toString("utf-8");
        // add the new key to the keystore
        await enckeystore.add(
          await jose.JWK.asKey(newKey)
        );

        // reencrypt the data key with the new key
        const enckd = await jose.JWE.createEncrypt(
          { format: "compact" },
          enckeystore.all()
        )
          .update(kdata)
          .final();

        // if key is older than 7 days delete it
        if (
          Date.now() - (enckeys[0].createdAt?.getTime() ?? Date.now()) >=
          7 * 24 * 60 * 60 * 1000
        ) {
          await Keys.deleteOne({ kid: enckeys[0].kid });
        }

        // update the data key
        await Keys.updateOne({ kid: "main" }, { kdata: enckd });
        // return it as a key
        return await jose.JWK.asKey(JSON.parse(kdata), "json");
      }
    }

    // decrypt the data key and send it back
    const kd = await jose.JWE.createDecrypt(enckeystore).decrypt(
      datakey!.kdata
    );
    return await jose.JWK.asKey(
      JSON.parse(kd.plaintext.toString("utf8")),
      "json"
    );
  } catch (err) {
    throw err;
  }
};
