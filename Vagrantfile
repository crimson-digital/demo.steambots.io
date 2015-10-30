# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "ubuntu/precise64"

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  # config.vm.network "forwarded_port", guest: 80, host: 8080

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  # config.vm.network :forwarded_port, guest: 80, host: 80

  config.vm.network :private_network, ip: "10.11.12.13"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.
  # config.vm.network "public_network"

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  config.vm.synced_folder ".", "/vagrant", type: "nfs"

  config.vm.provider "virtualbox" do |v|
    v.name = "demo.steambots"
    v.memory = "2048"
    v.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    v.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
    v.customize ["setextradata", :id, "vboxinternal2/sharedfoldersenablesymlinkscreate/v-root", "1"]
  end

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  # config.vm.provider "virtualbox" do |vb|
  #   # Display the VirtualBox GUI when booting the machine
  #   vb.gui = true
  #
  #   # Customize the amount of memory on the VM:
  #   vb.memory = "1024"
  # end
  #
  # View the documentation for the provider you are using for more
  # information on available options.

  # Define a Vagrant Push strategy for pushing to Atlas. Other push strategies
  # such as FTP and Heroku are also available. See the documentation at
  # https://docs.vagrantup.com/v2/push/atlas.html for more information.
  # config.push.define "atlas" do |push|
  #   push.app = "YOUR_ATLAS_USERNAME/YOUR_APPLICATION_NAME"
  # end

  # Enable provisioning with a shell script. Additional provisioners such as
  # Puppet, Chef, Ansible, Salt, and Docker are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision :shell, inline: $script, privileged: false, keep_color: true
end

$script = <<SCRIPT

echo "export APP_ENV=vagrant" | sudo tee -a /etc/profile

sudo apt-get update

# Set root mysql password to steambots
sudo debconf-set-selections <<< 'mysql-server mysql-server/root_password password steambots'
sudo debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password steambots'
sudo apt-get -y install mysql-server-5.5

# install subversion for node-steam
sudo apt-get install -y subversion

# install node 4.1.2
wget https://nodejs.org/download/release/v4.1.2/node-v4.1.2-linux-x64.tar.xz
tar xf node-v4.1.2-linux-x64.tar.xz
cd node-v4.1.2-linux-x64
sudo cp bin/* /usr/bin
sudo ln -sf /home/vagrant/node-v4.1.2-linux-x64/lib/node_modules/npm/bin/npm-cli.js /usr/bin/npm

# mount /vagrant/node_modules to /tmp/node_modules instead of symlink to avoid windows host bug
sudo rm -rf /vagrant/node_modules
sudo mkdir /tmp/node_modules
sudo mkdir /vagrant/node_modules
sudo chown -R vagrant:vagrant /tmp/node_modules
sudo chown -R vagrant:vagrant /vagrant/node_modules
echo "/tmp/node_modules /vagrant/node_modules none bind" | sudo tee -a /etc/fstab
sudo mount /vagrant/node_modules

# install node-inspector
sudo npm install -g node-inspector

sudo chown -R vagrant:vagrant /home/vagrant/.npm

# install npm dependancies
pushd /vagrant
npm install --no-bin-links

sleep 5

# make create a log folder and make it writable
sudo mkdir /log
sudo chmod 0777 /log

# copy the hosts file across
sudo cp /vagrant/conf/hosts/vagrant /etc/hosts

# create the database, add the schema
mysql -uroot -psteambots -e 'CREATE DATABASE demo_steambots;'
mysql -uroot -psteambots demo_steambots < /vagrant/schema/master.sql

# create the mysql user
mysql -uroot -psteambots -e 'CREATE USER "sample"@"localhost" IDENTIFIED BY "steambots"'
mysql -uroot -psteambots -e 'GRANT ALL PRIVILEGES ON demo_steambots.* TO "sample"@"localhost"'

# install gulp
sudo npm install -g gulp

SCRIPT
