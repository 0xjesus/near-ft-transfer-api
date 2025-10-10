# Guía de Deployment a Producción (TESTNET)

## 🔑 ¿Por qué necesitas las llaves privadas en el servidor?

**IMPORTANTE**: El servidor de producción **SÍ NECESITA** las llaves privadas de `clauder.testnet` porque:

1. El servidor firma las transacciones en nombre de tu cuenta
2. Sin la llave privada, no puede enviar tokens
3. Es como tener una cuenta bancaria sin la contraseña

**Pero tranquilo** - se guardan de forma segura con Docker y nunca se exponen.

## 🚀 Deployment Rápido

### En tu computadora local:

```bash
# 1. Asegúrate que todo está listo
git add .
git commit -m "Ready for production"
git push

# 2. Conecta a tu servidor
ssh user@tu-servidor-produccion
```

### En el servidor de producción:

```bash
# 1. Clona el repo
git clone tu-repo.git
cd near-ft-transfer-api

# 2. Las llaves YA están en .env.production (las mismas que usas local)
#    - SENDER_ACCOUNT_ID=clauder.testnet
#    - SENDER_PRIVATE_KEY=ed25519:4Tnm...
#    - FT_CONTRACT_ID=wrap.testnet

# 3. Dale permisos al script
chmod +x deploy.sh

# 4. ¡Despliega!
./deploy.sh
```

## ✅ Verificar que funciona

```bash
# Health check
curl http://localhost:3000/health

# Hacer una transferencia de prueba
curl -X POST http://localhost:3000/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "test.testnet",
    "amount": "1000000000000000000"
  }'

# Ver estadísticas
curl http://localhost:3000/stats
```

## 🔍 Comandos útiles

```bash
# Ver logs
docker-compose logs -f api

# Ver status
docker-compose ps

# Reiniciar
docker-compose restart

# Parar todo
docker-compose down

# Parar y borrar datos
docker-compose down -v
```

## 🛡️ Seguridad

El archivo `.env.production` contiene las llaves privadas pero:

1. ✅ Está en `.gitignore` - NO se sube a GitHub
2. ✅ Solo existe en tu compu y en el servidor de producción
3. ✅ Docker las usa como variables de entorno (no se ven en logs)
4. ✅ El container está aislado

## 📦 ¿Qué se despliega?

```
┌─────────────────────────┐
│   Docker Container      │
│                         │
│  ┌──────────────────┐  │
│  │   Node.js API    │  │
│  │  (tu código)     │  │
│  └──────────────────┘  │
│           ↓             │
│  Variables de entorno   │
│  - SENDER_PRIVATE_KEY   │
│  - SENDER_ACCOUNT_ID    │
│  └─────────────────────┘│
└─────────────────────────┘
          ↓
    Redis Container
    (persistencia)
```

## 🔧 Troubleshooting

### Error: "Transfer service not initialized"
```bash
# Verifica que la cuenta existe
curl -X POST https://neart.lava.build:443 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":"1",
    "method":"query",
    "params":{
      "request_type":"view_account",
      "finality":"final",
      "account_id":"clauder.testnet"
    }
  }'
```

### Ver logs del container
```bash
docker-compose logs -f api
```

### Reiniciar todo
```bash
docker-compose down
docker-compose up -d
```

## 🌐 Exponer a Internet (Opcional)

Si quieres que sea accesible desde internet:

```bash
# Instala nginx
sudo apt install nginx

# Crea config
sudo nano /etc/nginx/sites-available/near-api

# Contenido:
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Activa
sudo ln -s /etc/nginx/sites-available/near-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📞 Soporte

Si algo falla:
1. Revisa logs: `docker-compose logs -f`
2. Verifica balance de la cuenta
3. Checa que Redis esté corriendo: `docker-compose ps`
