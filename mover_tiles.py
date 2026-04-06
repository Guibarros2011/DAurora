import boto3

ACCOUNT_ID = "4a63bed3df747f03a75ad838248403dd"
ACCESS_KEY = "23df98ad6a8aa2a8842e88a2ce214c66"
SECRET_KEY = "79bd3234398fce35616d17fa887a0f5b4dd93e8ab150bf825dac44b8d39a1879"
BUCKET = "daurora-mapas"

s3 = boto3.client("s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name="auto"
)

paginator = s3.get_paginator("list_objects_v2")
total = 0
copiados = 0

# Conta total
for page in paginator.paginate(Bucket=BUCKET, Prefix="tiles/tiles/"):
    total += len(page.get("Contents", []))

print(f"Total a mover: {total}")

# Copia de tiles/tiles/X para tiles/X
for page in paginator.paginate(Bucket=BUCKET, Prefix="tiles/tiles/"):
    for obj in page.get("Contents", []):
        old_key = obj["Key"]
        new_key = old_key.replace("tiles/tiles/", "tiles/", 1)
        s3.copy_object(Bucket=BUCKET, CopySource={"Bucket": BUCKET, "Key": old_key}, Key=new_key)
        copiados += 1
        if copiados % 100 == 0 or copiados == total:
            print(f"  {copiados}/{total} ({copiados/total*100:.0f}%)")

print("✓ Concluído! Arquivos movidos para o caminho correto.")
print(f"  Teste: https://pub-45a49d6ca0624c49b17b329f06171787.r2.dev/tiles/info.json")
