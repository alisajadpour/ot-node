#!/bin/sh
pathToOtNode=$(pwd)
numberOfNodes=4
network="ganache"
availableNetworks=("ganache" "rinkeby")
export $(xargs < $pathToOtNode/.env)
export ACCESS_KEY=$RPC_ENDPOINT
# Check for script arguments
while [ $# -gt 0 ]; do
  case "$1" in
  	# Override number of nodes if the argument is specified
    --nodes=*)
      numberOfNodes="${1#*=}"
      if [[ $numberOfNodes -le 0 ]]
      then
        echo Cannot run 0 nodes
        exit 1
      fi
      ;;
    # Print script usage if --help is given
    --help)
      echo "Use --nodes=<insert_number_here> to specify the number of nodes to generate"
      echo "Use --network=<insert_network_name> to specify the network to connect to. Available networks: ganache, rinkeby. Default: ganache"
      exit 0
      ;;
    --network=*)
      network="${1#*=}"
      if [[ ! " ${availableNetworks[@]} " =~ " ${network} " ]]
      then
          echo Invalid network parameter. Available networks: ganache, rinkeby
          exit 1
      fi
      ;;
    *)
      printf "***************************\n"
      printf "* Error: Invalid argument.*\n"
      printf "***************************\n"
      exit 1
  esac
  shift
done
if [[ $network == ganache ]]
then
  echo ================================
  echo ====== Starting ganache ======
  echo ================================

  ganachePID="$(ps aux | grep '[g]anache-cli' | head -1 | awk '{print $2}')"
  if [ $ganachePID ]
  then
    echo Ganache is already running, stopping previous ganache process...
    kill -9 $ganachePID
  fi

  osascript -e "tell app \"Terminal\"
        do script \"cd $pathToOtNode
        npm explore dkg-evm-module -- npm run ganache\"
    end tell"

  echo ==================================================
  echo ====== Deploying contracts on local ganache ======
  echo ==================================================

  hubContractAddress=`npm explore dkg-evm-module -- npm run deploy | awk '/Hub address:/ {print $3}'`
  echo Using hub contract address: $hubContractAddress

fi

if [[ $network == rinkeby ]]
then

  echo ============================================
  echo ====== Deploying contracts on rinkeby ======
  echo ============================================

  hubContractAddress=`npm explore dkg-evm-module -- npm run deploy:rinkeby 2>&1 | awk '/Hub address:/ {print $3}'`
  echo Using hub contract address: $hubContractAddress
fi

echo ================================
echo ====== Generating configs ======
echo ================================

node $pathToOtNode/tools/local-network-setup/generate-config-files.js $numberOfNodes $network $hubContractAddress

echo ================================
echo ======== Starting nodes ========
echo ================================

startNode() {
  echo Starting node $1
  osascript -e "tell app \"Terminal\"
      do script \"cd $pathToOtNode
  node index.js ./tools/local-network-setup/.$1_origintrail_noderc\"
  end tell"
}

startNode bootstrap

# Start only DC node and exit
if [[ $numberOfNodes -ne 1 ]]
then
  i=1
  while [[ $i -lt $numberOfNodes ]]
  do
    startNode dh$i
    ((i = i + 1))
  done
fi
