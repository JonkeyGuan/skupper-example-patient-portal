# Patient Portal

#### A simple database-backed web application that runs in the public cloud but keeps its data in a private database

## Overview

This example is a simple database-backed web application that shows how you can use Skupper to access a database at a remote site without exposing it to the public internet.

It contains three services:

  * A PostgreSQL database running on a bare-metal or virtual machine in a private data center.
    
  * A payment-processing service running on Kubernetes in a private data center.
    
  * A web frontend service running on Kubernetes in the public cloud.  It uses the PostgreSQL database and the
    payment-processing service.

This example uses two Kubernetes namespaces, "private" and "public", to represent the private Kubernetes cluster and the public cloud.

## Prerequisites

* The `oc` command-line tool (https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/)
* 2 OpenShift Clusters - public & private
* OpenShfit access account with create project permission

## Step 1: Install the Skupper command-line tool

On Linux or Mac, you can use the install script (inspect it [here][install-script]) to download and extract the command:

~~~ shell
curl https://skupper.io/install.sh | sh
~~~

The script installs the command under your home directory.  It prompts you to add the command to your path if necessary.

Or place `skupper` binary to /usr/local/bin directory.

Please do **not** use **1.5.0** for now.

## Step 2: Access your clusters

Login public cluster from one terminal

```
oc login https://api.hub.jonkey.cc:6443 -u admin
```

Login private cluster from another terminal

```
oc login https://api.ocp11.jonkey.cc:6443 -u admin
```

## Step 3: Set up your namespaces

_**Console for public:**_

~~~ shell
oc new-project public
~~~

_**Console for private:**_

~~~ shell
oc new-project private
~~~

## Step 4: Install Skupper in your namespaces

The `skupper init` command installs the Skupper router and service controller in the current namespace.  Run the `skupper init` command in each namespace.

_**Console for public:**_

~~~ shell
skupper init
~~~

_Sample output:_

~~~ console
$ skupper init
Waiting for LoadBalancer IP or hostname...
Skupper is now installed in namespace 'public'.  Use 'skupper status' to get more information.
~~~

_**Console for private:**_

~~~ shell
skupper init skupper init --enable-console --enable-flow-collector
~~~

_Sample output:_

~~~ console
$ skupper init
Waiting for LoadBalancer IP or hostname...
Skupper is now installed in namespace 'private'.  Use 'skupper status' to get more information.
~~~

## Step 5: Check the status of your namespaces

Use `skupper status` in each console to check that Skupper is
installed.

_**Console for public:**_

~~~ shell
skupper status
~~~

_Sample output:_

~~~ console
$ skupper status
Skupper is enabled for namespace "public" in interior mode. It is connected to 1 other site. It has 1 exposed service.
The site console url is: <console-url>
The credentials for internal console-auth mode are held in secret: 'skupper-console-users'
~~~

_**Console for private:**_

~~~ shell
skupper status
~~~

_Sample output:_

~~~ console
$ skupper status
Skupper is enabled for namespace "private" in interior mode. It is connected to 1 other site. It has 1 exposed service.
The site console url is: <console-url>
The credentials for internal console-auth mode are held in secret: 'skupper-console-users'
~~~

As you move through the steps below, you can use `skupper status` at
any time to check your progress.

## Step 6: Link your namespaces

Creating a link requires use of two `skupper` commands in conjunction, `skupper token create` and `skupper link create`.

The `skupper token create` command generates a secret token that signifies permission to create a link.  The token also carries the link details.  Then, in a remote namespace, The `skupper link create` command uses the token to create a link to the namespace that generated it.

**Note:** The link token is truly a *secret*.  Anyone who has the token can link to your namespace.  Make sure that only those you
trust have access to it.

First, use `skupper token create` in one namespace to generate the token.  Then, use `skupper link create` in the other to create a link.

_**Console for public:**_

~~~ shell
skupper token create ~/secret.token
~~~

_Sample output:_

~~~ console
$ skupper token create ~/secret.token
Token written to ~/secret.token
~~~

_**Console for private:**_

~~~ shell
skupper link create ~/secret.token
~~~

_Sample output:_

~~~ console
$ skupper link create ~/secret.token
Site configured to link to https://10.105.193.154:8081/ed9c37f6-d78a-11ec-a8c7-04421a4c5042 (name=link1)
Check the status of the link using 'skupper link status'.
~~~

If your console sessions are on different machines, you may needto use `sftp` or a similar tool to transfer the token securely.
By default, tokens expire after a single use or **15 minutes** after creation.

## Step 7: Deploy and expose the database

Use `podman` to run the database service on your local machine. 
In the public namespace, use the `skupper gateway expose` command to expose the database on the Skupper network.

Use `oc get service/database` to ensure the database service is available.

_**Console for public:**_

~~~ shell
podman run --name database --detach --arch=amd64 --rm -p 5432:5432 quay.io/skupper/patient-portal-database
skupper gateway expose database localhost 5432 --type podman
oc get service/database
~~~

_Sample output:_

~~~ console
$ skupper gateway expose database localhost 5432 --type podman
2022/05/19 16:37:00 CREATE io.skupper.router.tcpConnector fancypants-jross-egress-database:5432 map[address:database:5432 host:localhost name:fancypants-jross-egress-database:5432 port:5432 siteId:0e7b70cf-1931-4c93-9614-0ecb3d0d6522]

$ oc get service/database
NAME       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
database   ClusterIP   10.104.77.32   <none>        5432/TCP   15s
~~~

## Step 8: Deploy and expose the payment processor

In the private namespace, use the `oc apply` command to deploy the payment processor service.  Use the `skupper expose`
command to expose the service on the Skupper network.

In the public namespace, use `oc get service/payment-processor` to check that the `payment-processor` service appears after a
moment.

_**Console for private:**_

~~~ shell
oc apply -f payment-processor/kubernetes.yaml
skupper expose deployment/payment-processor --port 8080
~~~

_Sample output:_

~~~ console
$ oc apply -f payment-processor/kubernetes.yaml
deployment.apps/payment-processor created

$ skupper expose deployment/payment-processor --port 8080
deployment payment-processor exposed as payment-processor
~~~

_**Console for public:**_

~~~ shell
oc get service/payment-processor
~~~

_Sample output:_

~~~ console
$ oc get service/payment-processor
NAME                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
payment-processor   ClusterIP   10.103.227.109   <none>        8080/TCP   1s
~~~

## Step 9: Deploy and expose the frontend

In the public namespace, use the `oc apply` command to deploy the frontend service.  This also sets up an external load
balancer for the frontend.

_**Console for public:**_

~~~ shell
oc apply -f frontend/kubernetes.yaml
oc expose service/frontend
~~~

## Step 10: Test the application

Now we're ready to try it out.  Use `oc get route/frontend` to look up the url of the frontend service.  Then use
`curl` or a similar tool to request the `/api/health` endpoint at that address.

_**Console for public:**_

~~~ shell
$ oc get route/frontend
~~~

_Sample output:_

~~~ console
$ curl http://<route-url>/api/health
OK
~~~

If everything is in order, you can now access the web interface by navigating to `http://<route-url>/` in your browser.

## Cleaning up

To remove Skupper and the other resources from this exercise, use the following commands.

_**Console for public:**_

~~~ shell
podman stop database
skupper gateway delete
oc delete project public
~~~

_**Console for private:**_

~~~ shell
oc delete project private
~~~
