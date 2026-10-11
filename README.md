# Selve to Matter Bridge

Translates Selve Home Server 2 Shutters to the [Matter](https://project-chip/connectedhomeip) standard.

This requires **NO** USB-RF gateway from Selve and only a compatible Matter Hub. One free option is the [Python Matter Server](https://github.com/matter-js/python-matter-server).

Note that as of now, only Commeo shutters will work because of technical limitations on my end.

## How to use

Execute the following command to create the bridge and start it via docker:
```bash
docker run -d \
    --name selve-matter-bridge \
    --restart=unless-stopped \
    --network=host \
    --env SELVE_SERVER_IP="<your-selve-server-ip>" \
    --env SELVE_SERVER_PASSWORD="<your-selve-server-password>" \
    --volume /path/to/selve-matter-bridge:/root/.matter \
    schneidermaster/selve-matter-bridge:latest
```

Alternatively, you can add the following service to your `docker-compose.yml`:
```yml
services:
  selve-matter-bridge:
    image: schneidermaster/selve-matter-bridge:latest
    container_name: selve-matter-bridge
    environment:
      - SELVE_SERVER_IP: <your-selve-server-ip>
      - SELVE_SERVER_PASSWORD: <your-selve-server-password>
    volumes:
      - /path/to/selve-matter-bridge:/root/.matter
    network_mode: host
    restart: unless-stopped
```

### Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `SELVE_SERVER_IP` | yes | Address of the Selve Home Server 2, with or without scheme: `192.168.1.10` or `http://192.168.1.10`. Without a scheme, `http://` is used. |
| `SELVE_SERVER_PASSWORD` | yes | Password of the Selve Home Server 2. |

Shutters that report an invalid state at startup, such as devices that are still paired on the server but no longer reachable, are ignored and logged.

### Persistent storage

The bridge stores its Matter commissioning data in `/root/.matter`. Map this path to persistent storage. If you do not, the bridge loses its pairing when the container is recreated, and you must commission it again.

A QR-Code and a code for pairing can be retrieved with:

```bash
docker logs selve-matter-bridge
```

## How to develop

Developing for this tool requires `yarn` to be installed.

Simply install all of the dependencies with:
```bash
yarn install
```

Credentials to your server can be entered in the `.env`.

To start the bridge execute:

```bash
yarn app
```

For local development, you also need to run a matter server and ideally Home Assistant to interact with the devices:

```bash
docker run -d \
  --name matter-server \
  --restart=unless-stopped \
  --network=host \
  --security-opt apparmor=unconfined \
  -v /opt/matter-server/data:/data \
  -v /run/dbus:/run/dbus:ro \
  ghcr.io/home-assistant-libs/python-matter-server:stable \
  --storage-path /data
```

```bash
docker run -d \
  --name homeassistant \
  --privileged \
  --restart=unless-stopped \
  -e TZ=Europe/Berlin \
  -v /path/to/ha/config:/config \
  --network=host \
  ghcr.io/home-assistant/home-assistant:stable
```
