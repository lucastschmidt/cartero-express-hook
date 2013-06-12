var fs = require( "fs" ),
	_ = require( "underscore" ),
	path = require( "path" ),
	async = require( "async" );

var kCarteroJsonFileName = "cartero.json";

module.exports = function( rootDir ) {

	var pageMap;
	var configMap;
	var staticDir;
	var carteroJson;

	try {
		carteroJson = JSON.parse( fs.readFileSync( path.join( rootDir, kCarteroJsonFileName ) ).toString() );
		pageMap = carteroJson.parcels;
		staticDir = carteroJson.publicDir;
	}
	catch( e ) {
		throw new Error( "Error while reading parcels.json file. Please run the grunt cartero task before running your application." + e.stack );
	}

	return function( req, res, next ) {

		var oldRender = res.render;

		res.render = function( requestPath, options ) {
			var pageMapKey = options && options.bundler_pageMapKey ? options.bundler_pageMapKey : requestPath.replace( rootDir, "" ).substring( 1 );
			var _arguments = arguments;

			var pageMetadata = pageMap[ pageMapKey ];
			if( ! pageMetadata ) return next( new Error( "Could not find pageKey " + pageMapKey + " in page key map." ) );

			res.locals.bundler_js = _.map( pageMetadata.js, function( fileName ) {
				return "<script type='text/javascript' src='" + fileName.replace( staticDir, "" ) + "'></script>";
			} ).join( "" );

			res.locals.bundler_css = _.map( pageMetadata.css, function( fileName ) {
				return "<link rel='stylesheet' href='" + fileName.replace( staticDir, "" ) + "'></link>";
			} ).join( "" );

			var tmplContents = "";

			async.each( pageMetadata.tmpl, function( fileName, cb ) {
				fs.readFile( path.join( rootDir, fileName ),  function( err, data ) {

					if( err ) {
						cb( err );
						return;
					}

					tmplContents += data.toString();
					cb();

				} );
			},
			function( err ) {
				if( err ) {
					console.log( "ERROR: Exception while reading tmpl files to inject into response: " + err );
				}

				res.locals.bundler_tmpl = tmplContents;
				oldRender.apply( res, _arguments );

			} );
			
		};

		next();
	};
};
