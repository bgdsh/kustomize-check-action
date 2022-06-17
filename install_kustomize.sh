#!/usr/bin/env bash

export kustomize_version=4.5.5

echo "getting download url for kustomize ${kustomize_version}"
for i in {1..100}; do
    url=$(curl -s "https://api.github.com/repos/kubernetes-sigs/kustomize/releases?per_page=100&page=$i" | jq -r '.[].assets[] | select(.browser_download_url | test("kustomize(_|.)?(v)?'$kustomize_version'_linux_amd64"))  | .browser_download_url')
    if [ ! -z $url ]; then 
        echo "Download URL found in $url"
        break
    fi
done

echo "Downloading kustomize v${kustomize_version}"
if [[ "${url}" =~ .tar.gz$ ]]; then
    curl -s -S -L ${url} | tar -xz -C .
else
    curl -s -S -L ${url} -o ./kustomize
fi
if [ "${?}" -ne 0 ]; then
    echo "Failed to download kustomize v${kustomize_version}."
    exit 1
fi
echo "Successfully downloaded kustomize v${kustomize_version}."

echo "Allowing execute privilege to kustomize."
chmod +x ./kustomize
if [ "${?}" -ne 0 ]; then
    echo "Failed to update kustomize privilege."
    exit 1
fi
echo "Successfully added execute privilege to kustomize."
./kustomize
pwd
ls -al