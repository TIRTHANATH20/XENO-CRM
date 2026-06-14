#!/usr/bin/env python3
import argparse
import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

RENDER_API_BASE = "https://api.render.com/v1"

SERVICES = [
    {
        "name": "xeno-backend",
        "dockerfilePath": "backend/Dockerfile",
        "dockerContext": "backend",
        "port": "8000",
    },
    {
        "name": "xeno-agents",
        "dockerfilePath": "agents/Dockerfile",
        "dockerContext": "agents",
        "port": "8001",
    },
    {
        "name": "xeno-channel-service",
        "dockerfilePath": "channel-service/Dockerfile",
        "dockerContext": "channel-service",
        "port": "8002",
    },
]


def api_request(path, method="GET", token=None, body=None):
    url = f"{RENDER_API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req) as resp:
            return json.load(resp)
    except HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        print(f"ERROR {exc.code} {exc.reason} for {method} {url}")
        print(payload)
        sys.exit(1)


def list_services(token, owner_id):
    result = api_request(f"/services?ownerId={owner_id}", method="GET", token=token)
    return {service["name"]: service for service in result}


def create_service(token, owner_id, repo, branch, service_def):
    payload = {
        "type": "web_service",
        "name": service_def["name"],
        "ownerId": owner_id,
        "repo": repo,
        "branch": branch,
        "autoDeploy": "yes",
        "serviceDetails": {
            "runtime": "docker",
            "region": "oregon",
            "healthCheckPath": "/health",
            "envVars": [
                {"key": "PORT", "value": service_def["port"]}
            ],
            "envSpecificDetails": {
                "dockerfilePath": service_def["dockerfilePath"],
                "dockerContext": service_def["dockerContext"],
            },
        },
    }
    print(f"Creating Render service {service_def['name']}...")
    return api_request("/services", method="POST", token=token, body=payload)


def main():
    parser = argparse.ArgumentParser(
        description="Create Render services for Xeno via Render public API."
    )
    parser.add_argument("--owner-id", help="Render workspace owner ID")
    parser.add_argument("--repo", help="GitHub repository URL")
    parser.add_argument("--branch", default="main", help="Repo branch to deploy")
    parser.add_argument("--api-key", help="Render API key")
    parser.add_argument("--yes", action="store_true", help="Create services if they do not exist")

    args = parser.parse_args()

    token = args.api_key or os.environ.get("RENDER_API_KEY")
    owner_id = args.owner_id or os.environ.get("RENDER_OWNER_ID")
    repo = args.repo or os.environ.get("RENDER_REPO_URL")

    if not token:
        print("Missing Render API key. Set --api-key or RENDER_API_KEY.")
        sys.exit(1)
    if not owner_id:
        print("Missing Render owner ID. Set --owner-id or RENDER_OWNER_ID.")
        sys.exit(1)
    if not repo:
        print("Missing repository URL. Set --repo or RENDER_REPO_URL.")
        sys.exit(1)

    services_by_name = list_services(token, owner_id)
    print(f"Found {len(services_by_name)} existing Render service(s) in workspace.")

    for service in SERVICES:
        name = service["name"]
        if name in services_by_name:
            service_id = services_by_name[name]["id"]
            print(f"Skipping {name}: already exists with service ID {service_id}")
            continue
        if not args.yes:
            print(f"Service {name} does not exist. Use --yes to create it.")
            continue
        result = create_service(token, owner_id, repo, args.branch, service)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
