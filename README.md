[Turtl](https://turtlapp.com/)
==========================

_Opening an issue? See the [Turtl project tracker](https://github.com/turtl/project-tracker/issues)_

This is the heart of Turtl!

It's the javascript core that runs the app whether on desktop or mobile. It
contains Turtl's interfaces, logic, crypto, etc.

## Documentation

If you're interested in how Turtl works, [check out the docs](https://turtlapp.com/docs/).

## Building

Turtl uses a makefile to generate itself. Here's a few commands to get you started
(this assumes you have Node.js/npm installed already):

```bash
mkdir turtl
cd turtl/
git clone https://github.com/turtl/js.git
cd js/
npm install
make
```

Running `make` here generates all the assets for the project and it's now ready
to be run by any webserver (just make sure all requests are sent to `index.html`,
see the `.htaccess` file for reference).

