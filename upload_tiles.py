import boto3, os

ACCOUNT_ID = "4a63bed3df747f03a75ad838248403dd"
ACCESS_KEY = "23df98ad6a8aa2a8842e88a2ce214c66"
SECRET_KEY = "79bd3234398fce35616d17fa887a0f5b4dd93e8ab150bf825dac44b8d39a1879"
BUCKET     = "daurora-mapas"
LOCAL_DIR  = os.path.expanduser("~/daurora/tiles_upload")

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name="auto"
)

total  = sum(len(fs) for _, _, fs in os.walk(LOCAL_DIR))
feitos = 0

print(f"Iniciando upload de {total} arquivos...")

for root, dirs, files in os.walk(LOCAL_DIR):
    for fname in files:
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, LOCAL_DIR)
        key = "tiles/" + rel.replace("\\", "/")
        ct  = "application/json" if fname.endswith(".json") else "image/jpeg"
        s3.upload_file(local_path, BUCKET, key, ExtraArgs={"ContentType": ct})
        feitos += 1
        if feitos % 100 == 0 or feitos == total:
            print(f"  {feitos}/{total} ({feitos/total*100:.0f}%)")

print("✓ Upload concluído!")
print(f"  URL do info.json: https://pub-45a49d6ca0624c49b17b329f06171787.r2.dev/tiles/info.json")
